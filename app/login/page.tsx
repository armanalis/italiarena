/** Login and sign-up page. */
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getPostAuthPath } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

const loginErrors: Record<string, string> = {
  auth_callback_failed: "Could not verify your reset link. Please try again.",
  reset_link_expired: "Your reset link has expired. Request a new one below.",
};

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthPath());
  }

  const authError = searchParams?.error
    ? loginErrors[searchParams.error] ?? null
    : null;

  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-y-auto bg-background px-4 py-8 touch-scroll sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.22),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.15),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.25),_transparent_50%)]" />

      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] space-y-4">
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
    </main>
  );
}
