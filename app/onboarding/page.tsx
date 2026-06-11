/** First-time setup — pick a target language and proficiency level. */
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getCurrentUserProfile, isOnboardingComplete } from "@/lib/auth";

export default async function OnboardingPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

  return (
    <main className="relative w-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.22),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.15),_transparent_45%)]" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-12 sm:py-10">
        <OnboardingForm defaultUsername={profile.display_name} />
      </div>
    </main>
  );
}
