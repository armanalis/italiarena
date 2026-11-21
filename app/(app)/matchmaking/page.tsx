/** Matchmaking lobby — real-player search or instant ghost match. */
import { redirect } from "next/navigation";
import { MatchmakingLobby } from "@/components/matchmaking/matchmaking-lobby";
import { requireOnboardingComplete } from "@/lib/auth";
import { hasArena } from "@/lib/constants";

import { normalizeBotDifficulty, type BotDifficulty } from "@/lib/bot";

type MatchmakingPageProps = {
  searchParams: Promise<{
    mode?: string;
    difficulty?: string;
  }>;
};

export default async function MatchmakingPage({ searchParams }: MatchmakingPageProps) {
  const profile = await requireOnboardingComplete();

  if (!profile.target_language || !profile.proficiency_level) {
    redirect("/onboarding");
  }
  if (!hasArena(profile.target_language)) redirect("/");

  const params = await searchParams;
  const mode = params.mode === "bot" ? "bot" : "real";
  const botDifficulty: BotDifficulty =
    mode === "bot" ? normalizeBotDifficulty(params.difficulty) : "medium";

  return (
    <MatchmakingLobby
      profile={profile}
      mode={mode}
      botDifficulty={botDifficulty}
    />
  );
}
