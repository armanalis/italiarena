"use server";

import { createClient } from "@/utils/supabase/server";
import { GHOST_PLAYER_ID, GHOST_PLAYER_NAME } from "@/lib/ghost";
import { getPublicDisplayName } from "@/lib/display-name";
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
  const supabase = createClient();
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

async function getOpponentDisplayName(opponentId: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", opponentId)
    .maybeSingle();

  if (!data) {
    return "Opponent";
  }

  return getPublicDisplayName(data);
}

async function fetchQuestionsByIds(ids: string[]): Promise<QuestionActive[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createClient();
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

async function generatePlaylist(
  userId: string,
  language: string,
  level: string
): Promise<QuestionActive[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_random_questions", {
    p_language: language,
    p_level: level,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as QuestionActive[] | null) ?? [];
}

function playlistIds(questions: QuestionActive[]): string[] {
  return questions.map((question) => question.id);
}

export async function searchForMatch(
  existingSessionId?: string | null
): Promise<MatchmakingResult> {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { profile } = auth;
  const supabase = createClient();
  const language = profile.target_language!;
  const level = profile.proficiency_level!;

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
      const questionIds = (existingSession.question_playlist as string[]) ?? [];
      const playlist = await fetchQuestionsByIds(questionIds);

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
                    : await getOpponentDisplayName(opponentId),
                }
              : null,
          },
        };
      }

      if (
        existingSession.status === "waiting" &&
        existingSession.player_a_id === profile.id
      ) {
        return {
          success: true,
          data: {
            sessionId: existingSession.id,
            status: "waiting",
            playlist,
            opponent: null,
          },
        };
      }
    }
  }

  const { data: openSession, error: openError } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("status", "waiting")
    .eq("language", language)
    .eq("level", level)
    .is("player_b_id", null)
    .neq("player_a_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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
      const questionIds = (joinedSession.question_playlist as string[]) ?? [];
      const playlist = await fetchQuestionsByIds(questionIds);

      return {
        success: true,
        data: {
          sessionId: joinedSession.id,
          status: "active",
          playlist,
          opponent: {
            id: joinedSession.player_a_id,
            isGhost: false,
            displayName: await getOpponentDisplayName(joinedSession.player_a_id),
          },
        },
      };
    }
  }

  const questions = await generatePlaylist(profile.id, language, level);

  if (questions.length === 0) {
    return {
      success: false,
      error: "No questions available for your language and level yet.",
    };
  }

  const { data: createdSession, error: createError } = await supabase
    .from("game_sessions")
    .insert({
      player_a_id: profile.id,
      status: "waiting",
      language,
      level,
      question_playlist: playlistIds(questions),
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
      playlist: questions,
      opponent: null,
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

  const supabase = createClient();
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
      const questionIds = (existingSession.question_playlist as string[]) ?? [];
      const playlist = await fetchQuestionsByIds(questionIds);
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
                  : await getOpponentDisplayName(opponentId),
              }
            : null,
        },
      };
    }

    return { success: false, error: "Session is no longer waiting." };
  }

  const questionIds = (updatedSession.question_playlist as string[]) ?? [];
  const playlist = await fetchQuestionsByIds(questionIds);

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

export async function getMatchSession(sessionId: string) {
  const auth = await getAuthenticatedProfile();
  if ("error" in auth) {
    return { success: false as const, error: auth.error };
  }

  const supabase = createClient();
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

  const questionIds = (session.question_playlist as string[]) ?? [];
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
      status: session.status as "waiting" | "active" | "completed" | "abandoned",
      playlist,
      opponent: opponentId
        ? {
            id: opponentId,
            isGhost,
            displayName: isGhost
              ? GHOST_PLAYER_NAME
              : await getOpponentDisplayName(opponentId),
          }
        : null,
    },
  };
}
