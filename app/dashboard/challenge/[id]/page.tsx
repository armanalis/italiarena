/** A private challenge: the host shares it and waits; the friend joins from here. */
import { redirect } from "next/navigation";
import { ChallengeLobby } from "@/components/challenge/challenge-lobby";
import { getPlayerDisplayName } from "@/app/dashboard/matchmaking/actions";
import { requireOnboardingComplete } from "@/lib/auth";
import { getServerSiteUrl } from "@/lib/site-url-server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ChallengePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChallengePage({ params }: ChallengePageProps) {
  const profile = await requireOnboardingComplete();
  const { id } = await params;

  // Service role: other players cannot read a private lobby; the link is the invitation.
  const { data: session } = await createAdminClient()
    .from("game_sessions")
    .select("id, player_a_id, player_b_id, status, level, is_private, challenged_id")
    .eq("id", id)
    .maybeSingle();

  const isHost = session?.player_a_id === profile.id;

  if (
    session?.status === "active" &&
    (isHost || session.player_b_id === profile.id)
  ) {
    redirect(`/dashboard/match/${id}`);
  }

  const open = Boolean(
    session?.is_private && session.status === "waiting" && !session.player_b_id
  );
  const sentToSomeoneElse = Boolean(
    open && !isHost && session?.challenged_id && session.challenged_id !== profile.id
  );
  // Null until challenge-codes-2026-10-10.sql runs: the page then shows only the link.
  const code =
    open && isHost
      ? ((await (await createClient()).rpc("challenge_code", { p_session_id: id })).data as string | null)
      : null;

  return (
    <ChallengeLobby
      sessionId={id}
      link={`${await getServerSiteUrl()}/dashboard/challenge/${id}`}
      code={code}
      state={!open ? "closed" : isHost ? "host" : sentToSomeoneElse ? "not_for_you" : "guest"}
      hostName={open && !isHost ? await getPlayerDisplayName(session!.player_a_id) : null}
      level={session?.level ?? null}
    />
  );
}
