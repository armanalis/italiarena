/** First-time setup — pick a target language and proficiency level. */
import { redirect } from "next/navigation";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  getCurrentUserProfile,
  isGuestUser,
  isOnboardingComplete,
} from "@/lib/auth";
import { isGuestAuthUser } from "@/lib/guest-auth";
import { createClient } from "@/utils/supabase/server";

export default async function OnboardingPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (isGuestUser(profile) || isGuestAuthUser(user))) {
    redirect("/guest");
  }

  return (
    <AuroraCanvas>
      <main className="mx-auto w-full max-w-lg px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-12 sm:py-10">
        <OnboardingForm defaultUsername={profile.display_name} />
      </main>
    </AuroraCanvas>
  );
}
