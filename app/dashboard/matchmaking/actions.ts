"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserProfile, isOnboardingComplete } from "@/lib/auth";
import {
  BOT_DIFFICULTY_LABELS,
  normalizeBotDifficulty,
  type BotDifficulty,
} from "@/lib/bot";
import { GHOST_PLAYER_ID, GHOST_PLAYER_NAME } from "@/lib/ghost";
import {
  REGULAR_MATCH_QUESTIONS,
  buildMatchPlaylist,
  splitSessionQuestions,
} from "@/lib/match";
import {
  buildQuestionPlaylistPayload,
  extractQuestionIds,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import { PUBLIC_QUESTION_COLUMNS } from "@/lib/resolve-match-questions";
import type { PublicQuestion } from "@/types/database.types";
import type { UserProfile } from "@/lib/types";

type MatchmakingSuccess = {
  sessionId: string;
  status: "waiting" | "active";
  playlist: PublicQuestion[];
  opponent: {
    id: string;
    isGhost: boolean;
    displayName: string;
  } | null;
};

type MatchmakingResult =
  | { success: true; data: MatchmakingSuccess }
  | { success: false; error: string };

/**
 * Only lobbies created within this window are joinable. A host searches for
 * 10 s (MATCH_SEARCH_SECONDS) and then cancels its lobby, so anything older is
 * a zombie left behind by a closed tab — joining one strands the joiner in a
 * session whose host (the sync leader) will never show up.
 * KEEP IN SYNC with claim_silent_opponent (supabase/audit-2-fixes-2026-10-10.sql).
 */
const JOINABLE_SESSION_MAX_AGE_MS = 15_000;

async function getAuthenticatedProfile(): Promise<
  { profile: UserProfile } | { error: string }
> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated." };
  }

  if (!isOnboardingComplete(profile)) {
    return { error: "Complete onboarding before matchmaking." };
  }

  return { profile };
}

export async function getPlayerDisplayName(userId: string): Promise<string> {
  // Players can read only their own users row, so names come from this RPC.
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_display_name", {
    p_user_id: userId,
  });
  return typeof data === "string" && data.trim() ? data.trim() : "Player";
}

/** Playlist questions WITHOUT answers — this is what reaches the browser. */
async function fetchQuestionsByIds(ids: string[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions_active")
    .select(PUBLIC_QUESTION_COLUMNS)
    .in("id", ids);

  if (error || !data) {
    return [];
  }

  const byId = new Map(
    (data as PublicQuestion[]).map((question) => [question.id, question])
  );
  return ids
    .map((id) => byId.get(id))
    .filter((question): question is PublicQuestion => Boolean(question));
}

async function resolveSessionQuestions(questionIds: string[]) {
  const allQuestions = await fetchQuestionsByIds(questionIds);
  const { regular } = splitSessionQuestions(allQuestions);
  return regular;
}

async function markQuestionsSeen(userId: string, questionIds: string[]) {
  if (questionIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  await supabase.rpc("update_seen_questions", {
    p_user_id: userId,
    p_question_ids: questionIds,
  });
}

async function getQuestionRotationContext(userId: string) {
  const supabase = await createClient();

  const [{ data: stats }, { data: lastSession }] = await Promise.all([
    supabase
      .from("player_stats")
      .select("seen_questions")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("game_sessions")
      .select("question_playlist")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const seenQuestions = (stats?.seen_questions ?? []) as string[];
  const recentPlaylist = extractQuestionIds(lastSession?.question_playlist);

  return {
    seenIds: new Set<string>(seenQuestions),
    recentIds: new Set<string>(recentPlaylist),
  };
}

async function generateMatchQuestions(
  userId: string,
  language: string,
  level: string
) {
  const supabase = await createClient();
  const [{ data: pool, error: poolError }, { seenIds, recentIds }] =
    await Promise.all([
      supabase
        .from("questions_active")
        .select(PUBLIC_QUESTION_COLUMNS)
        .eq("language", language)
        .eq("level", level),
      getQuestionRotationContext(userId),
    ]);

  if (poolError) {
    throw new Error(poolError.message);
  }

  const regular = buildMatchPlaylist(
    (pool ?? []) as PublicQuestion[],
    recentIds,
    seenIds
  );

  if (regular.length < REGULAR_MATCH_QUESTIONS) {
    throw new Error(
      `Add at least ${REGULAR_MATCH_QUESTIONS} Italian questions for ${level} before playing.`
    );
  }

  const sessionIds = regular.map((question) => question.id);
  await markQuestionsSeen(userId, sessionIds);

  return {
    regular,
    sessionIds,
  };
}

function insufficientQuestionsMessage(level: string) {
  return `Add at least ${REGULAR_MATCH_QUESTIONS} Italian questions for ${level} before playing.`;
}

async function abandonOwnWaitingSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  playerId: string
) {
  await supabase
    .from("game_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId)
    .eq("player_a_id", playerId)
    .eq("status", "waiting");
}

export async function searchForMatch(
  existingSessionId?: string | null
): Promise<MatchmakingResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { profile } = auth;
  const supabase = await createClient();
  const language = profile.target_language!;
  const level = profile.proficiency_level!;

  let ownWaitingSession: {
    id: string;
    created_at: string;
    question_playlist: unknown;
  } | null = null;

  if (existingSessionId) {
    const { data: existingSession, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", existingSessionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (existingSession) {
      const questionIds = extractQuestionIds(existingSession.question_playlist);
      const playlist = await resolveSessionQuestions(questionIds);

      if (existingSession.status === "active") {
        const opponentId = existingSession.player_b_id;
        const isGhost = opponentId === GHOST_PLAYER_ID;

        return {
          success: true,
          data: {
            sessionId: existingSession.id,
            status: "active",
            playlist,
            opponent: opponentId
              ? {
                  id: opponentId,
                  isGhost,
                  displayName: isGhost
                    ? GHOST_PLAYER_NAME
                    : await getPlayerDisplayName(opponentId),
                }
              : null,
          },
        };
      }

      if (
        existingSession.status === "waiting" &&
        existingSession.player_a_id === profile.id
      ) {
        ownWaitingSession = existingSession;
      }
    }
  }

  // Abandon any OTHER waiting lobby this player owns (zombies from refreshes,
  // closed tabs, or double-fired searches). Without this, the opponent can
  // join a session the host is no longer watching and get stuck on
  // "Preparing match" forever — while the host waits in a different session.
  let staleCleanup = supabase
    .from("game_sessions")
    .update({ status: "abandoned" })
    .eq("player_a_id", profile.id)
    .eq("status", "waiting")
    // A pending challenge stays open while its host searches.
    .eq("is_private", false);

  if (ownWaitingSession) {
    staleCleanup = staleCleanup.neq("id", ownWaitingSession.id);
  }

  await staleCleanup;

  // Always look for an older open lobby to join. If both players create a session
  // at the same time, the one with the newer session joins the older host.
  // Only fresh lobbies qualify — see JOINABLE_SESSION_MAX_AGE_MS.
  let openSessionQuery = supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "waiting")
    .eq("is_private", false)
    .eq("language", language)
    .eq("level", level)
    .is("player_b_id", null)
    .neq("player_a_id", profile.id)
    .gte(
      "created_at",
      new Date(Date.now() - JOINABLE_SESSION_MAX_AGE_MS).toISOString()
    )
    .order("created_at", { ascending: true })
    .limit(1);

  if (ownWaitingSession) {
    openSessionQuery = openSessionQuery.lt(
      "created_at",
      ownWaitingSession.created_at
    );
  }

  const { data: openSession, error: openError } =
    await openSessionQuery.maybeSingle();

  if (openError) {
    return { success: false, error: openError.message };
  }

  if (openSession) {
    const { data: joinedSession, error: joinError } = await supabase
      .from("game_sessions")
      .update({
        player_b_id: profile.id,
        status: "active",
      })
      .eq("id", openSession.id)
      .eq("status", "waiting")
      .is("player_b_id", null)
      .select("*")
      .maybeSingle();

    if (joinError) {
      return { success: false, error: joinError.message };
    }

    if (joinedSession) {
      if (ownWaitingSession) {
        await abandonOwnWaitingSession(
          supabase,
          ownWaitingSession.id,
          profile.id
        );
      }

      const questionIds = extractQuestionIds(joinedSession.question_playlist);
      const playlist = await resolveSessionQuestions(questionIds);
      await markQuestionsSeen(profile.id, questionIds);

      return {
        success: true,
        data: {
          sessionId: joinedSession.id,
          status: "active",
          playlist,
          opponent: {
            id: joinedSession.player_a_id,
            isGhost: false,
            displayName: await getPlayerDisplayName(joinedSession.player_a_id),
          },
        },
      };
    }
  }

  if (ownWaitingSession) {
    const questionIds = extractQuestionIds(ownWaitingSession.question_playlist);
    const playlist = await resolveSessionQuestions(questionIds);

    return {
      success: true,
      data: {
        sessionId: ownWaitingSession.id,
        status: "waiting",
        playlist,
        opponent: null,
      },
    };
  }

  let matchQuestions;

  try {
    matchQuestions = await generateMatchQuestions(profile.id, language, level);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : insufficientQuestionsMessage(level),
    };
  }

  // Service role: players cannot create sessions themselves, so they cannot
  // choose a match's question ids (see answer-secrecy-2-lockdown-2026-10.sql).
  const { data: createdSession, error: createError } = await createAdminClient()
    .from("game_sessions")
    .insert({
      player_a_id: profile.id,
      status: "waiting",
      language,
      level,
      question_playlist: buildQuestionPlaylistPayload(matchQuestions.sessionIds),
    })
    .select("*")
    .single();

  if (createError || !createdSession) {
    return {
      success: false,
      error: createError?.message ?? "Could not create match session.",
    };
  }

  return {
    success: true,
    data: {
      sessionId: createdSession.id,
      status: "waiting",
      playlist: matchQuestions.regular,
      opponent: null,
    },
  };
}

/** Creates an active session against the ghost opponent in one step (Play vs bot). */
export async function startBotMatch(
  difficulty: BotDifficulty = "medium"
): Promise<MatchmakingResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { profile } = auth;
  const language = profile.target_language!;
  const level = profile.proficiency_level!;
  const botDifficulty = normalizeBotDifficulty(difficulty);

  let matchQuestions;

  try {
    matchQuestions = await generateMatchQuestions(profile.id, language, level);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : insufficientQuestionsMessage(level),
    };
  }

  // Service role, as above. The bot tier is stored so the server can play
  // the bot (reveal_round_answer) and a refresh keeps the right tier.
  const { data: createdSession, error: createError } = await createAdminClient()
    .from("game_sessions")
    .insert({
      player_a_id: profile.id,
      player_b_id: GHOST_PLAYER_ID,
      status: "active",
      language,
      level,
      question_playlist: buildQuestionPlaylistPayload(matchQuestions.sessionIds),
      bot_difficulty: botDifficulty,
    })
    .select("*")
    .single();

  if (createError || !createdSession) {
    return {
      success: false,
      error:
        createError?.message ??
        "Could not start ghost match. Run supabase/matchmaking-migration.sql if you have not already.",
    };
  }

  return {
    success: true,
    data: {
      sessionId: createdSession.id,
      status: "active",
      playlist: matchQuestions.regular,
      opponent: {
        id: GHOST_PLAYER_ID,
        isGhost: true,
        displayName: BOT_DIFFICULTY_LABELS[botDifficulty],
      },
    },
  };
}

type ChallengeResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

/**
 * A private lobby at the host's level: shared as a link, or sent to one
 * friend (friendId), who then sees it in their friends panel. Matchmaking
 * never joins it, and the stale-session cleanup closes it after an hour.
 */
export async function createChallenge(
  friendId: string | null
): Promise<ChallengeResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { profile } = auth;
  const language = profile.target_language!;
  const level = profile.proficiency_level!;

  let matchQuestions;
  try {
    matchQuestions = await generateMatchQuestions(profile.id, language, level);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : insufficientQuestionsMessage(level),
    };
  }

  // Service role, as for every new session (players cannot pick question ids).
  const { data, error } = await createAdminClient()
    .from("game_sessions")
    .insert({
      player_a_id: profile.id,
      status: "waiting",
      language,
      level,
      question_playlist: buildQuestionPlaylistPayload(matchQuestions.sessionIds),
      is_private: true,
      challenged_id: friendId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not create the challenge." };
  }

  return { success: true, sessionId: data.id };
}

/**
 * Joins a challenge. Other players cannot see private lobbies, so this goes
 * through join_challenge, which also refuses one sent to someone else.
 */
export async function joinChallenge(sessionId: string): Promise<ChallengeResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();
  const { data: playlist, error } = await supabase.rpc("join_challenge", {
    p_session_id: sessionId,
  });

  if (error) {
    return { success: false, error: "Could not join the challenge. Try again." };
  }

  if (!playlist) {
    return {
      success: false,
      error: "This challenge has already started, expired, or was sent to someone else.",
    };
  }

  await markQuestionsSeen(auth.profile.id, extractQuestionIds(playlist));
  return { success: true, sessionId };
}

/** Joins a challenge by the 6-digit code its host shared. */
export async function joinChallengeByCode(code: string): Promise<ChallengeResult> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { success: false, error: "Enter the 6-digit code." };
  }

  const supabase = await createClient();
  const { data: sessionId, error } = await supabase.rpc("challenge_by_code", {
    p_code: trimmed,
  });
  if (error) {
    return {
      success: false,
      error: error.message.includes("too_many_tries")
        ? "Too many wrong codes. Try again in 15 minutes."
        : "Could not check the code. Try again.",
    };
  }
  if (!sessionId) {
    return { success: false, error: "No open challenge has this code. Check it, or ask for a new one." };
  }

  return joinChallenge(sessionId as string);
}

export async function cancelMatchSearch(
  sessionId?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!sessionId) {
    return { success: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId)
    .eq("player_a_id", auth.profile.id)
    .eq("status", "waiting");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getMatchSession(sessionId: string) {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false as const, error: auth.error };
  }

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    return { success: false as const, error: error?.message ?? "Session not found." };
  }

  const isParticipant =
    session.player_a_id === auth.profile.id ||
    session.player_b_id === auth.profile.id;

  if (!isParticipant) {
    return { success: false as const, error: "You are not part of this match." };
  }

  const { questionIds, sync: matchSync } = parseQuestionPlaylist(
    session.question_playlist
  );
  // Full playlist (no slice): a sudden-death tiebreaker question may have
  // been appended as an 11th entry mid-match.
  const playlist = await fetchQuestionsByIds(questionIds);
  const opponentId =
    session.player_a_id === auth.profile.id
      ? session.player_b_id
      : session.player_a_id;

  const isGhost = opponentId === GHOST_PLAYER_ID;

  return {
    success: true as const,
    data: {
      sessionId: session.id,
      localPlayerRole: (session.player_a_id === auth.profile.id ? "a" : "b") as "a" | "b",
      status: session.status as "waiting" | "active" | "completed" | "abandoned",
      playlist,
      matchSync,
      opponent: opponentId
        ? {
            id: opponentId,
            isGhost,
            displayName: isGhost
              ? session.bot_difficulty
                ? BOT_DIFFICULTY_LABELS[normalizeBotDifficulty(session.bot_difficulty)]
                : GHOST_PLAYER_NAME
              : await getPlayerDisplayName(opponentId),
          }
        : null,
    },
  };
}
