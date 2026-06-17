/** Guest mode — disclaimer, proficiency picker, and session start. */
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import {
  startGuestSession,
  type GuestFormState,
} from "@/app/guest/actions";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { scrollFieldIntoView } from "@/lib/scroll-field-into-view";
import { cn } from "@/lib/utils";

const initialState: GuestFormState = { error: null };

const fieldClassName = cn(
  "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base shadow-sm md:text-sm",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  "dark:bg-white/5"
);

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="h-11 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 dark:shadow-indigo-950/50"
    >
      {pending ? "Starting guest session..." : "Play as a Guest"}
    </Button>
  );
}

export function GuestSetupForm() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, formAction] = useActionState(startGuestSession, initialState);

  useActionRedirect(state?.redirectTo);

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-card/60 dark:shadow-indigo-950/40">
      <div className="border-b border-border/60 bg-gradient-to-br from-amber-500/10 via-transparent to-indigo-500/10 px-5 pb-6 pt-6 dark:border-white/10 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
          <UserRound className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Play as a Guest</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Jump into a match without creating an account. Best for playing with
          friends when you don&apos;t want to enroll.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        <div
          className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4"
          role="note"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-foreground">
              Before you continue as a guest
            </p>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              You will be assigned a random name like{" "}
              <span className="font-medium text-foreground">Guest428623827</span>.
              You cannot choose your own username.
            </li>
            <li>
              You must still pick a proficiency level so matches use the right
              questions and opponents at your level.
            </li>
            <li>
              Guest accounts do <span className="font-medium text-foreground">not</span>{" "}
              appear on the proficiency leaderboard for your level.
            </li>
            <li>
              Guest sessions are temporary. Sign up for a full account to save
              progress, choose a username, and compete on the leaderboard.
            </li>
            <li>
              We store only the data needed to run guest matches, in line with
              GDPR and Italian privacy law. See our{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </div>

        <form action={formAction} className="space-y-6">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 dark:bg-white/5">
            <input
              type="checkbox"
              name="acknowledged"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 size-4 rounded border-input"
            />
            <span className="text-sm text-muted-foreground">
              I understand guest mode limits and want to play without enrolling.
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="guest-proficiency_level" className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              Proficiency level
            </Label>
            <select
              id="guest-proficiency_level"
              name="proficiency_level"
              required
              disabled={!acknowledged}
              defaultValue=""
              className={cn(
                fieldClassName,
                !acknowledged && "cursor-not-allowed opacity-60"
              )}
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
            <p className="text-xs text-muted-foreground">
              Used for matchmaking and question difficulty. Accept the terms above
              to enable this field.
            </p>
          </div>

          {state?.error && (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {state.error}
            </div>
          )}

          <SubmitButton disabled={!acknowledged} />

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
