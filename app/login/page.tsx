/** Login and sign-up page. */
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getPostAuthPath } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

const loginErrors: Record<string, string> = {
  auth_callback_failed:
    "Google sign-in did not complete. Enable Google under Supabase → Authentication → Providers, add your redirect URLs, then try again. You can still sign in with email or username.",
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
    <main className="relative w-full bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.22),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.15),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.25),_transparent_50%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[420px] px-4 pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 sm:pb-12 sm:pt-8">
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
      </div>
    </main>
  );
}
