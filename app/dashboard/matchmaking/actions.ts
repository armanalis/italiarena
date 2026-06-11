"use server";

import { createClient } from "@/utils/supabase/server";
import { BOT_DIFFICULTY_LABELS, type BotDifficulty } from "@/lib/bot";
import { GHOST_PLAYER_ID, GHOST_PLAYER_NAME } from "@/lib/ghost";
import { getPublicDisplayName } from "@/lib/display-name";
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
import type { QuestionActive } from "@/types/database.types";
import type { UserProfile } from "@/lib/types";

type MatchmakingSuccess = {
  sessionId: string;
  status: "waiting" | "active";
  playlist: QuestionActive[];
  opponent: {
    id: string;
    isGhost: boolean;
    displayName: string;
  } | null;
};

type MatchmakingResult =
  | { success: true; data: MatchmakingSuccess }
  | { success: false; error: string };

async function getAuthenticatedProfile(): Promise<
  { profile: UserProfile } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, display_name, target_language, proficiency_level, role")
    .eq("id", user.id)
    .single();

  if (error || !profile?.target_language || !profile?.proficiency_level) {
    return { error: "Complete onboarding before matchmaking." };
  }

  return { profile: { ...profile, role: profile.role ?? "user", display_name: profile.display_name ?? null, sound_enabled: true, haptics_enabled: true } as UserProfile };
}

export async function getPlayerDisplayName(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: rpcName, error: rpcError } = await supabase.rpc(
    "get_public_display_name",
    { p_user_id: userId }
  );

  if (!rpcError && typeof rpcName === "string" && rpcName.trim()) {
    return rpcName.trim();
  }

  const { data } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return "Player";
  }

  return getPublicDisplayName(data);
}

export async function getMatchPlayerNames(session: {
  player_a_id: string;
  player_b_id: string | null;
}) {
  const playerAName = await getPlayerDisplayName(session.player_a_id);

  if (!session.player_b_id) {
    return { playerAName, playerBName: "Waiting..." };
  }

  const playerBName =
    session.player_b_id === GHOST_PLAYER_ID
      ? GHOST_PLAYER_NAME
      : await getPlayerDisplayName(session.player_b_id);

  return { playerAName, playerBName };
}

async function fetchQuestionsByIds(ids: string[]): Promise<QuestionActive[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions_active")
    .select("*")
    .in("id", ids);

  if (error || !data) {
    return [];
  }

  const byId = new Map(data.map((question) => [question.id, question]));
  return ids
    .map((id) => byId.get(id))
    .filter((question): question is QuestionActive => Boolean(question));
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
        .select("*")
        .eq("language", language)
        .eq("level", level),
      getQuestionRotationContext(userId),
    ]);

  if (poolError) {
    throw new Error(poolError.message);
  }

  const regular = buildMatchPlaylist(pool ?? [], recentIds, seenIds);

  if (regular.length < REGULAR_MATCH_QUESTIONS) {
    throw new Error(
      `Add at least ${REGULAR_MATCH_QUESTIONS} questions for ${language} / ${level} before playing.`
    );
  }

  const sessionIds = regular.map((question) => question.id);
  await markQuestionsSeen(userId, sessionIds);

  return {
    regular,
    sessionIds,
  };
}

function insufficientQuestionsMessage(language: string, level: string) {
  return `Add at least ${REGULAR_MATCH_QUESTIONS} questions for ${language} / ${level} before playing.`;
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

  // Always look for an older open lobby to join. If both players create a session
  // at the same time, the one with the newer session joins the older host.
  let openSessionQuery = supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "waiting")
    .eq("language", language)
    .eq("level", level)
    .is("player_b_id", null)
    .neq("player_a_id", profile.id)
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
          : insufficientQuestionsMessage(language, level),
    };
  }

  const { data: createdSession, error: createError } = await supabase
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
  const supabase = await createClient();
  const language = profile.target_language!;
  const level = profile.proficiency_level!;

  let matchQuestions;

  try {
    matchQuestions = await generateMatchQuestions(profile.id, language, level);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : insufficientQuestionsMessage(language, level),
    };
  }

  const { data: createdSession, error: createError } = await supabase
    .from("game_sessions")
    .insert({
      player_a_id: profile.id,
      player_b_id: GHOST_PLAYER_ID,
      status: "active",
      language,
      level,
      question_playlist: buildQuestionPlaylistPayload(matchQuestions.sessionIds),
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
        displayName: BOT_DIFFICULTY_LABELS[difficulty],
      },
    },
  };
}

export async function startGhostMatch(
  sessionId: string
): Promise<MatchmakingResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();
  const { data: updatedSession, error } = await supabase
    .from("game_sessions")
    .update({
      player_b_id: GHOST_PLAYER_ID,
      status: "active",
    })
    .eq("id", sessionId)
    .eq("player_a_id", auth.profile.id)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!updatedSession) {
    const { data: existingSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (existingSession?.status === "active") {
      const questionIds = extractQuestionIds(existingSession.question_playlist);
      const playlist = await resolveSessionQuestions(questionIds);
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

    return { success: false, error: "Session is no longer waiting." };
  }

  const questionIds = extractQuestionIds(updatedSession.question_playlist);
  const playlist = await resolveSessionQuestions(questionIds);

  return {
    success: true,
    data: {
      sessionId: updatedSession.id,
      status: "active",
      playlist,
      opponent: {
        id: GHOST_PLAYER_ID,
        isGhost: true,
        displayName: GHOST_PLAYER_NAME,
      },
    },
  };
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
  const playlist = await resolveSessionQuestions(questionIds);
  const opponentId =
    session.player_a_id === auth.profile.id
      ? session.player_b_id
      : session.player_a_id;

  const isGhost = opponentId === GHOST_PLAYER_ID;

  return {
    success: true as const,
    data: {
      sessionId: session.id,
      status: session.status as "waiting" | "active" | "completed" | "abandoned",
      playlist,
      matchSync,
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
