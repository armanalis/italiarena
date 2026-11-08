/** Guest mode — proficiency picker and one-click start. */
"use client";

import { fill, useT, useUiLanguage } from "@/components/ui-language-provider";
import { privacyHref } from "@/lib/legal";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { completeGuestProfile } from "@/app/guest/actions";
import { PROFICIENCY_LEVELS, TARGET_LANGUAGES } from "@/lib/constants";
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
  /** From a /german or /italian link. */
  defaultLanguage?: string | null;
};

export function GuestSetupForm({ defaultLanguage }: GuestSetupFormProps = {}) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const router = useRouter();
  const [targetLanguage, setTargetLanguage] = useState(defaultLanguage ?? "");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!targetLanguage || !proficiencyLevel) {
      setError("Please select a language and your proficiency level.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();

      // No server-side fallback: it created accounts with the service role,
      // which bypassed Supabase's per-IP limit on anonymous sign-ins.
      const auth = await signInGuestOnClient();

      if (!auth.ok) {
        setError(auth.error);
        return;
      }

      const result = await completeGuestProfile(targetLanguage, proficiencyLevel);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(result.redirectTo ?? "/");
      router.refresh();
    });
  }

  return (
    <div className="glass-panel w-full max-w-lg overflow-hidden">
      <div className="border-b border-border px-5 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-border bg-muted text-foreground">
          <UserRound className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Play as a Guest")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("Pick a language and your level and start playing — no account or username needed.")}
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
        <div
          className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4"
          role="note"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-foreground">{t("Quick guest play")}</p>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              {fill(t("You'll get a unique auto-generated name (like {example}) — a new one every time you play as a guest."), {
                example: <span className="font-medium text-foreground">Guesta1b2c3d4e5f6</span>,
              })}
            </li>
            <li>{t("Guest players don't appear on the proficiency leaderboard.")}</li>
            <li>
              {t("Guests cannot contribute questions to the community pool — sign up for a full account to submit.")}
            </li>
            <li>
              {t("Sign up later to save progress and pick your own username.")}{" "}
              <Link
                href={privacyHref(uiLanguage)}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Privacy policy")}
              </Link>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="guest-target_language">{t("Language to learn")}</Label>
            <select
              id="guest-target_language"
              name="target_language"
              required
              disabled={isPending}
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className={fieldClassName}
              onFocus={(event) => scrollFieldIntoView(event.currentTarget)}
            >
              <option value="" disabled>
                {t("Select a language")}
              </option>
              {TARGET_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {t(language)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-proficiency_level" className="flex items-center gap-2">
              <GraduationCap className="size-4 text-muted-foreground" />
              {t("Proficiency level")}
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
                {t("Select your level")}
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
              {t(error)}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || !targetLanguage || !proficiencyLevel}
            className="h-11 w-full "
          >
            {isPending ? t("Starting...") : t("Start playing")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("Want a permanent account?")}{" "}
            <Link
              href="/login?mode=signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("Sign up instead")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
