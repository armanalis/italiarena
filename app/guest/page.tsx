/** Guest mode entry — proficiency setup without sign-up. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { GuestSetupForm } from "@/components/guest/guest-setup-form";
import { LegalFooter } from "@/components/legal/privacy-policy";
import { getCurrentUserProfile, isOnboardingComplete } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function GuestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getCurrentUserProfile();
    if (profile && isOnboardingComplete(profile)) {
      redirect("/dashboard");
    }
  }

  return (
    <AuroraCanvas>
      <main className="mx-auto w-full max-w-lg px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-12 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>

        <GuestSetupForm isAuthenticated={Boolean(user)} />
        <LegalFooter className="mt-8" />
      </main>
    </AuroraCanvas>
  );
}
