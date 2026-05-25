/** Set a new password after following the email reset link. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/utils/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=reset_link_expired");
  }

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-y-auto bg-background px-4 py-8 touch-scroll sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.22),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />

      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to login
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-card/60">
          <div className="border-b border-border/60 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10 px-5 pb-6 pt-6 dark:border-white/10 sm:px-8 sm:pb-7 sm:pt-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <KeyRound className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a new password for {user.email}.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
