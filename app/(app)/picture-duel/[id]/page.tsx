/** One Picture Duel: the host's lobby with the link, the friend's invitation, then the game and its results. */
import { PictureDuelRoom } from "@/components/picture-duel/picture-duel-room";
import { requireOnboardingComplete } from "@/lib/auth";
import type { PictureDuel } from "@/lib/picture-duel";
import { getServerSiteUrl } from "@/lib/site-url-server";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function PictureDuelRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireOnboardingComplete();
  const { id } = await params;

  // Service role: before joining, the friend cannot read the duel; the link is the invitation.
  const { data } = await createAdminClient().from("picture_duels").select("*").eq("id", id).maybeSingle();
  const duel = data as PictureDuel | null;
  const isPlayer = Boolean(duel && (duel.host_id === profile.id || duel.guest_id === profile.id));

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <PictureDuelRoom
        me={profile.id}
        initial={isPlayer && duel?.status !== "cancelled" ? duel : null}
        // Only what the invitation shows: no pictures before the friend joins. The room hides it after an hour.
        invite={
          !isPlayer && duel?.status === "waiting"
            ? {
                id,
                hostName: duel.host_name,
                language: duel.language,
                level: duel.level,
                topic: duel.topic,
                createdAt: duel.created_at,
              }
            : null
        }
        link={`${await getServerSiteUrl()}/picture-duel/${id}`}
      />
    </main>
  );
}
