/** Active match — synced game loop with scoring, bots, audio, and haptics. */
import { redirect } from "next/navigation";
import { MatchResultRecorder } from "@/components/match/match-result-recorder";
import { GameLoop } from "@/components/match/game-loop";
import { MatchHydrator } from "@/components/match/match-hydrator";
import { getMatchSession } from "@/app/dashboard/matchmaking/actions";
import { requireOnboardingComplete } from "@/lib/auth";
import { getPublicDisplayName } from "@/lib/display-name";
import { GHOST_PLAYER_NAME } from "@/lib/ghost";

type MatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const profile = await requireOnboardingComplete();
  const { id: sessionIdFromRoute } = await params;

  const result = await getMatchSession(sessionIdFromRoute);

  if (!result.success) {
    redirect("/dashboard");
  }

  const { sessionId, status, playlist, opponent, localPlayerRole } = result.data;

  // Only bounce waiting lobbies back to matchmaking. Completed / abandoned
  // sessions must stay on this route so players can review mistakes as long
  // as they want.
  if (status === "waiting") {
    redirect("/dashboard/matchmaking");
  }

  const isBotMatch = opponent?.isGhost ?? false;
  const localName = getPublicDisplayName(profile);
  const opponentName = isBotMatch
    ? GHOST_PLAYER_NAME
    : (opponent?.displayName ?? "Waiting...");
  const [playerAName, playerBName] =
    localPlayerRole === "a" ? [localName, opponentName] : [opponentName, localName];

  return (
    <>
      <MatchHydrator
        sessionId={sessionId}
        opponent={opponent}
        playlist={playlist}
      />
      <MatchResultRecorder />
      <GameLoop
        sessionId={sessionId}
        localUserId={profile.id}
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
