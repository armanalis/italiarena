/** Active match — synced game loop with scoring, bots, audio, and haptics. */
import { redirect } from "next/navigation";
import { MatchResultRecorder } from "@/components/match/match-result-recorder";
import { GameLoop } from "@/components/match/game-loop";
import { MatchHydrator } from "@/components/match/match-hydrator";
import {
  getMatchPlayerNames,
  getMatchSession,
} from "@/app/dashboard/matchmaking/actions";
import { requireOnboardingComplete } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

type MatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const profile = await requireOnboardingComplete();
  const supabase = await createClient();
  const { id: sessionIdFromRoute } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getMatchSession(sessionIdFromRoute);

  if (!result.success) {
    redirect("/dashboard");
  }

  const { sessionId, status, playlist, opponent } = result.data;

  if (status === "waiting") {
    redirect("/dashboard/matchmaking");
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select("player_a_id, player_b_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    redirect("/dashboard");
  }

  const localPlayerRole =
    session.player_a_id === user.id
      ? "a"
      : session.player_b_id === user.id
        ? "b"
        : null;

  if (!localPlayerRole) {
    redirect("/dashboard");
  }

  const isBotMatch = opponent?.isGhost ?? false;
  const { playerAName, playerBName } = await getMatchPlayerNames(session);

  return (
    <>
      <MatchHydrator
        sessionId={sessionId}
        opponent={opponent}
        playlist={playlist}
      />
      <MatchResultRecorder
        language={profile.target_language!}
        level={profile.proficiency_level!}
      />
      <GameLoop
        sessionId={sessionId}
        localUserId={user.id}
        localPlayerRole={localPlayerRole}
        isBotMatch={isBotMatch}
        proficiencyLevel={profile.proficiency_level!}
        playerAName={playerAName}
        playerBName={playerBName}
        serverPlaylist={playlist}
      />
    </>
  );
}
