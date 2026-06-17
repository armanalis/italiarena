/** Guest mode entry — disclaimer and proficiency setup without sign-up. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { GuestSetupForm } from "@/components/guest/guest-setup-form";
import { LegalFooter } from "@/components/legal/privacy-policy";
import { getPostAuthPath } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function GuestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthPath());
  }

  return (
    <main className="relative w-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.18),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.28),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.15),_transparent_45%)]" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 py-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-12 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>

        <GuestSetupForm />
        <LegalFooter className="mt-8" />
      </div>
    </main>
  );
}
