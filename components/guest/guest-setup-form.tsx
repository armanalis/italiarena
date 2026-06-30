/** Guest mode — proficiency picker and one-click start. */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  completeGuestProfile,
  provisionGuestViaAdmin,
} from "@/app/guest/actions";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { signInGuestOnClient } from "@/lib/guest-auth-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { scrollFieldIntoView } from "@/lib/scroll-field-into-view";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base shadow-sm md:text-sm",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  "dark:bg-white/5"
);

type GuestSetupFormProps = {
  /** @deprecated Each submit starts a fresh guest session; kept for API compatibility. */
  isAuthenticated?: boolean;
};

export function GuestSetupForm(_props?: GuestSetupFormProps) {
  const router = useRouter();
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!proficiencyLevel) {
      setError("Please select your proficiency level.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();

      const auth = await signInGuestOnClient();

      if (!auth.ok) {
        const adminResult = await provisionGuestViaAdmin();
        if (adminResult.error) {
          setError(adminResult.error);
          return;
        }
      }

      const result = await completeGuestProfile(proficiencyLevel);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="glass-panel w-full max-w-lg overflow-hidden">
      <div className="border-b border-border px-5 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-border bg-muted text-foreground">
          <UserRound className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Play as a Guest</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick your level and start playing — no account or username needed.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        <div
          className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4"
          role="note"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-foreground">Quick guest play</p>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              You&apos;ll get a unique auto-generated name (like{" "}
              <span className="font-medium text-foreground">Guesta1b2c3d4e5f6</span>
              ) — a new one every time you play as a guest.
            </li>
            <li>Guest players don&apos;t appear on the proficiency leaderboard.</li>
            <li>
              Sign up later to save progress and pick your own username.{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Informativa sulla privacy
              </Link>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="guest-proficiency_level" className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              Proficiency level
            </Label>
            <select
              id="guest-proficiency_level"
              name="proficiency_level"
              required
              disabled={isPending}
              value={proficiencyLevel}
              onChange={(event) => setProficiencyLevel(event.target.value)}
              className={fieldClassName}
              onFocus={(event) => scrollFieldIntoView(event.currentTarget)}
            >
              <option value="" disabled>
                Select your level
              </option>
              {PROFICIENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || !proficiencyLevel}
            className="h-11 w-full "
          >
            {isPending ? "Starting..." : "Start playing"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Want a permanent account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up instead
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
