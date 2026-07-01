/** Login and sign-up page. */
import { redirect } from "next/navigation";
import Link from "next/link";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { LoginForm } from "@/components/auth/login-form";
import { LegalFooter } from "@/components/legal/privacy-policy";
import { getPostAuthPath } from "@/lib/auth";
import { getProductionSiteUrl } from "@/lib/site-url";
import { createClient } from "@/utils/supabase/server";

const loginErrors: Record<string, string> = {
  auth_callback_failed: `Google sign-in did not complete. In Supabase → Authentication → URL configuration, set Site URL to ${getProductionSiteUrl()}, add ${getProductionSiteUrl()}/auth/callback and ${getProductionSiteUrl()}/auth/confirm to Redirect URLs, and remove any old language-quiz-one.vercel.app entries. Then try again. You can still sign in with email or username.`,
  auth_confirm_failed:
    "Email confirmation did not complete. The link may be invalid or already used. Sign up again to receive a new verification email, or try signing in if your account is already confirmed.",
  auth_confirm_expired:
    "That confirmation link has expired or was already used. Sign up again to receive a new verification email.",
  auth_session_expired:
    "That sign-in link was already used or expired. Close any extra tabs and try again.",
  reset_link_expired: "Your reset link has expired. Request a new one below.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthPath());
  }

  const params = await searchParams;
  const authError = params.error ? loginErrors[params.error] ?? null : null;

  return (
    <AuroraCanvas>
      <main className="mx-auto w-full max-w-[420px] px-4 pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 sm:pb-12 sm:pt-8">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>

        <div className="space-y-4">
          {authError && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {authError}
            </div>
          )}
          <LoginForm />
        </div>
        <LegalFooter className="mt-8" />
      </main>
    </AuroraCanvas>
  );
}
