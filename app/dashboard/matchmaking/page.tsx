/** Matchmaking lobby — real-player search or instant ghost match. */
import { redirect } from "next/navigation";
import { MatchmakingLobby } from "@/components/matchmaking/matchmaking-lobby";
import { requireOnboardingComplete } from "@/lib/auth";

type MatchmakingPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function MatchmakingPage({ searchParams }: MatchmakingPageProps) {
  const profile = await requireOnboardingComplete();

  if (!profile.target_language || !profile.proficiency_level) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const mode = params.mode === "bot" ? "bot" : "real";

  return <MatchmakingLobby profile={profile} mode={mode} />;
}
