/** Set a new password after following the email reset link. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/utils/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=reset_link_expired");
  }

  return (
    <AuroraCanvas>
      <main className="mx-auto w-full max-w-[420px] px-4 pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 sm:pb-12 sm:pt-8">
        <Link
          href="/login"
          className="mb-6 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to login
        </Link>
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-border px-5 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-border bg-muted text-foreground">
              <KeyRound className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a new password for {user.email}.
            </p>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <ResetPasswordForm />
          </div>
        </div>
      </main>
    </AuroraCanvas>
  );
}
