/** Landing page for email links — avoids inbox scanners consuming one-time tokens. */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { KeyRound, MailCheck } from "lucide-react";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { ItalianBrandIcon } from "@/components/italian-brand-icon";
import { Button } from "@/components/ui/button";
import { buildAuthConfirmVerifyPath } from "@/lib/auth-email-confirm";

type ConfirmPendingPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
};

function isEmailOtpType(value: string | undefined): value is EmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export default async function ConfirmPendingPage({
  searchParams,
}: ConfirmPendingPageProps) {
  const params = await searchParams;
  const tokenHash = params.token_hash;
  const type = params.type;
  const next = params.next ?? null;

  if (!tokenHash || !isEmailOtpType(type)) {
    redirect("/login?error=auth_confirm_failed");
  }

  const verifyPath = buildAuthConfirmVerifyPath({
    tokenHash,
    type,
    next,
  });
  const isRecovery = type === "recovery";

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
            <div className="mb-5 flex size-12 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              <ItalianBrandIcon className="size-10" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isRecovery ? "Reset your password" : "Confirm your email"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isRecovery
                ? "Tap the button below to open the secure password reset form."
                : "Tap the button below to verify your email and finish setting up your account."}
            </p>
          </div>

          <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-7">
            <Button asChild className="h-11 w-full gap-2">
              <Link href={verifyPath}>
                {isRecovery ? (
                  <>
                    <KeyRound className="size-4" />
                    Continue to reset password
                  </>
                ) : (
                  <>
                    <MailCheck className="size-4" />
                    Confirm email address
                  </>
                )}
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              This extra step keeps automated inbox scanners from using your
              one-time link before you do.
            </p>
          </div>
        </div>
      </main>
    </AuroraCanvas>
  );
}
