"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { Loader2, LogOut, Mail, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/login/actions";
import {
  changePassword,
  deleteAccount,
  updateGameplayPreferences,
  updateLearningProfile,
  updateFriendPrivacy,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_LANGUAGE,
  isTargetLanguage,
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGES,
  type ProficiencyLevel,
  type TargetLanguage,
} from "@/lib/constants";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/legal";
import { getSoundVolume, writeGameplayPreferences } from "@/lib/preferences";
import { resetWelcomeTour } from "@/lib/welcome-tour";
import type { MatchHistoryEntry, UserProfile } from "@/lib/types";
import { SoundVolumeControl } from "@/components/sound-volume-control";
import { CoffeeLink } from "@/components/coffee-link";
import { GitHubLink } from "@/components/github-link";
import { AddToHomeScreenGuide } from "@/components/settings/add-to-home-screen-guide";
import { NotificationsSettingsCard } from "@/components/settings/notifications-settings-card";
import { PrivacyDataCard } from "@/components/settings/privacy-data-card";
import { cn } from "@/lib/utils";
import { UiLanguageCard } from "@/components/settings/ui-language-card";
import { fill, useT, useUiLanguage } from "@/components/ui-language-provider";
import { useHydrated } from "@/hooks/use-browser-value";

type SettingsPanelsProps = {
  profile: UserProfile;
  recentMatches: MatchHistoryEntry[];
  showLastSeen: boolean;
  showDailyResults: boolean;
  languageLevels: Partial<Record<TargetLanguage, ProficiencyLevel>>;
};

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{t(label)}</p>
        <p className="text-xs text-muted-foreground">{t(description)}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-60"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 translate-x-1 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-6"
          )}
        />
      </button>
    </div>
  );
}

function resultLabel(result: MatchHistoryEntry["result"]) {
  if (result === "win") return "Win";
  if (result === "loss") return "Loss";
  return "Tie";
}

export function SettingsPanels({
  profile,
  recentMatches,
  showLastSeen: initialShowLastSeen,
  showDailyResults: initialShowDailyResults,
  languageLevels,
}: SettingsPanelsProps) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  // The server runs on UTC: match times are printed only in the browser.
  const hydrated = useHydrated();
  const guest = profile.is_guest;
  const router = useRouter();
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(
    profile.target_language ?? DEFAULT_LANGUAGE
  );
  const [proficiencyLevel, setProficiencyLevel] = useState<string>(
    profile.proficiency_level ?? ""
  );
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [soundEnabled, setSoundEnabled] = useState(profile.sound_enabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(profile.haptics_enabled);
  const [showLastSeen, setShowLastSeen] = useState(initialShowLastSeen);
  const [showDailyResults, setShowDailyResults] = useState(initialShowDailyResults);
  const [isPending, startTransition] = useTransition();
  const [deleteRedirectTo, setDeleteRedirectTo] = useState<string | null>(null);
  useActionRedirect(deleteRedirectTo);

  useEffect(() => {
    writeGameplayPreferences({
      soundEnabled: profile.sound_enabled,
      soundVolume: getSoundVolume(),
      hapticsEnabled: profile.haptics_enabled,
    });
  }, [profile.haptics_enabled, profile.sound_enabled]);

  function saveProfile() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("target_language", targetLanguage);
      formData.set("proficiency_level", proficiencyLevel);
      formData.set("display_name", displayName);

      const result = await updateLearningProfile(formData);
      if (result.success) {
        toast.success(t("Profile updated."));
        return;
      }
      toast.error(t(result.error));
    });
  }

  function savePreferences(nextSound: boolean, nextHaptics: boolean) {
    setSoundEnabled(nextSound);
    setHapticsEnabled(nextHaptics);
    writeGameplayPreferences({
      soundEnabled: nextSound,
      soundVolume: getSoundVolume(),
      hapticsEnabled: nextHaptics,
    });

    startTransition(async () => {
      const result = await updateGameplayPreferences(nextSound, nextHaptics);
      if (result.success) {
        toast.success(t("Gameplay preferences saved."));
        return;
      }
      toast.error(t(result.error));
    });
  }

  function saveFriendPrivacy(
    setting: "show_last_seen" | "show_daily_results",
    value: boolean,
    show: (value: boolean) => void
  ) {
    show(value);
    startTransition(async () => {
      const result = await updateFriendPrivacy(setting, value);
      if (result.success) {
        toast.success(t("Privacy setting saved."));
        return;
      }
      show(!value);
      toast.error(t(result.error));
    });
  }

  function handlePasswordSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        toast.success(t("Password updated."));
        return;
      }
      toast.error(t(result.error));
    });
  }

  function handleDeleteAccount(formData: FormData) {
    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (!result.success) {
        toast.error(t(result.error));
        return;
      }

      if ("redirectTo" in result && result.redirectTo) {
        setDeleteRedirectTo(result.redirectTo);
      }
    });
  }

  return (
    <div className="grid w-full max-w-3xl gap-6">
      <UiLanguageCard />
      {guest ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle>{t("Guest account")}</CardTitle>
            <CardDescription>
              {fill(t("You're playing as {name} at level {level}. Guest names are assigned automatically and guest players are excluded from the leaderboard."), {
                name: <span className="font-medium text-foreground">{profile.display_name ?? t("Guest")}</span>,
                level: profile.proficiency_level ?? "",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="min-h-11">
              <a href="/login?mode=signup">{t("Create a full account")}</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("Learning profile")}</CardTitle>
            <CardDescription>
              {t("Choose the language you are learning, your level and your public display name.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-email">{t("Email")}</Label>
              <Input id="settings-email" value={profile.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-display-name">{t("Username")}</Label>
              <Input
                id="settings-display-name"
                value={displayName}
                maxLength={24}
                placeholder={t("Used to sign in and shown to opponents")}
                disabled={isPending}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Language")}</Label>
                <Select
                  value={targetLanguage}
                  disabled={isPending}
                  onValueChange={(value) => {
                    if (isTargetLanguage(value)) {
                      setTargetLanguage(value);
                      // Each language keeps its own level; a new one starts unpicked.
                      setProficiencyLevel(languageLevels[value] ?? "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Language")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language}>
                        {t(language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("Proficiency level")}</Label>
                <Select
                  value={proficiencyLevel}
                  disabled={isPending}
                  onValueChange={setProficiencyLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Level")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              className="min-h-11"
              disabled={isPending || !proficiencyLevel || !displayName.trim()}
              onClick={saveProfile}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("Saving...")}
                </>
              ) : (
                t("Save profile")
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <AddToHomeScreenGuide />

      {!guest && (
        <NotificationsSettingsCard
          initialEnabled={profile.daily_reminder_enabled}
          initialHour={profile.daily_reminder_hour}
        />
      )}

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Friends")}</CardTitle>
          <CardDescription>{t("Choose what your friends can see.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceToggle
            label="Show last seen"
            description="Friends see when you were last online."
            checked={showLastSeen}
            disabled={isPending}
            onChange={(value) => saveFriendPrivacy("show_last_seen", value, setShowLastSeen)}
          />
          <PreferenceToggle
            label="Show my daily results to friends"
            description="Friends see your Wordle, Word Wheel and Sprint scores for today, never your answers."
            checked={showDailyResults}
            disabled={isPending}
            onChange={(value) => saveFriendPrivacy("show_daily_results", value, setShowDailyResults)}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Gameplay")}</CardTitle>
          <CardDescription>{t("Control sound and haptic feedback during matches.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div className="mb-3">
              <p className="text-sm font-medium">Volume</p>
              <p className="text-xs text-muted-foreground">
                {t("Drag to turn match sounds up or down.")}
              </p>
            </div>
            <SoundVolumeControl showSlider />
          </div>
          <PreferenceToggle
            label="Sound effects"
            description="Correct, wrong, and timer sounds in matches."
            checked={soundEnabled}
            disabled={isPending}
            onChange={(value) => savePreferences(value, hapticsEnabled)}
          />
          <PreferenceToggle
            label="Haptic feedback"
            description="Vibration when the round timer drops below 5 seconds."
            checked={hapticsEnabled}
            disabled={isPending}
            onChange={(value) => savePreferences(soundEnabled, value)}
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t("Welcome tour")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Replay the quick intro on how to play.")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetWelcomeTour();
                router.push("/");
              }}
            >
              {t("Replay")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Recent matches")}</CardTitle>
          <CardDescription>{t("Your last 10 completed {language} games.", { language: t(profile.target_language ?? DEFAULT_LANGUAGE) })}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No completed matches yet. Play a game to see history here.")}
            </p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {t("vs {name}", { name: match.opponent_display_name })}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {match.opponent_type === "ghost" ? t("Ghost") : t("Real player")}
                      </span>
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        match.result === "win" && "bg-emerald-500/15 text-emerald-400",
                        match.result === "loss" && "bg-destructive/15 text-destructive",
                        match.result === "tie" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {t(resultLabel(match.result))}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {match.user_score} — {match.opponent_score} · {t(match.language)} · {match.level}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hydrated ? new Date(match.played_at).toLocaleString(uiLanguage) : "\u00a0"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!guest && (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Change password")}</CardTitle>
          <CardDescription>{t("Update your sign-in password.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handlePasswordSubmit(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="current_password">{t("Current password")}</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">{t("New password")}</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t("Confirm new password")}</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                disabled={isPending}
                required
              />
            </div>
            <Button type="submit" className="min-h-11" disabled={isPending}>
              {isPending ? t("Updating...") : t("Update password")}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Account")}</CardTitle>
          <CardDescription>
            {guest ? t("End your guest session or send feedback.") : t("Sign out or send feedback about the app.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* The only sign-out in the app, so it asks first. */}
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="min-h-11 w-full gap-2 sm:w-auto">
                <LogOut className="size-4" />
                {guest ? t("End guest session") : t("Sign out")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{guest ? t("End guest session?") : t("Sign out of {app}?", { app: APP_NAME })}</DialogTitle>
                <DialogDescription>
                  {guest
                    ? t("A guest account can't be opened again, so its progress is lost.")
                    : t("Your progress is saved. Sign back in any time.")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="min-h-11">
                    {t("Cancel")}
                  </Button>
                </DialogClose>
                <form action={signOut}>
                  <Button type="submit" variant="destructive" className="min-h-11 w-full gap-2">
                    <LogOut className="size-4" />
                    {guest ? t("End session") : t("Sign out")}
                  </Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button asChild variant="secondary" className="min-h-11 w-full gap-2 sm:w-auto">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} feedback`)}`}
            >
              <Mail className="size-4" />
              {t("Send feedback")}
            </a>
          </Button>

          {/* Phones have no sidebar, where computers find this. */}
          {!guest && (
            <Button asChild variant="secondary" className="min-h-11 w-full gap-2 sm:w-auto md:hidden">
              <Link href="/contribute">
                <PenLine className="size-4" />
                {t("Add a question")}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("Support the project")}</CardTitle>
          <CardDescription>
            {t("{app} is free and open source.", { app: APP_NAME })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <CoffeeLink
            showLabel
            variant="outline"
            className="min-h-11 w-full justify-center px-4 text-foreground sm:w-auto"
          />
          <GitHubLink
            showLabel
            variant="outline"
            className="min-h-11 w-full justify-center px-4 text-foreground sm:w-auto"
          />
        </CardContent>
      </Card>

      <PrivacyDataCard />

      <Card id="delete-account" className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t("Delete account")}</CardTitle>
          <CardDescription>
            {t("Permanently remove your account, stats, and match history. This cannot be undone.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleDeleteAccount(new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="confirmation">{t("Type DELETE to confirm")}</Label>
              <Input
                id="confirmation"
                name="confirmation"
                placeholder="DELETE"
                disabled={isPending}
                required
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              className="min-h-11 gap-2"
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              {isPending ? t("Deleting...") : t("Delete my account")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
