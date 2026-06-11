"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { Loader2, LogOut, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/login/actions";
import {
  changePassword,
  deleteAccount,
  updateGameplayPreferences,
  updateLearningProfile,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
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
import { PROFICIENCY_LEVELS, TARGET_LANGUAGE } from "@/lib/constants";
import { getSoundVolume, writeGameplayPreferences } from "@/lib/preferences";
import type { MatchHistoryEntry, UserProfile } from "@/lib/types";
import { SoundVolumeControl } from "@/components/sound-volume-control";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "armanalis1905@gmail.com";

type SettingsPanelsProps = {
  profile: UserProfile;
  recentMatches: MatchHistoryEntry[];
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
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
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

export function SettingsPanels({ profile, recentMatches }: SettingsPanelsProps) {
  const [proficiencyLevel, setProficiencyLevel] = useState(
    profile.proficiency_level ?? ""
  );
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [soundEnabled, setSoundEnabled] = useState(profile.sound_enabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(profile.haptics_enabled);
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
      formData.set("target_language", TARGET_LANGUAGE);
      formData.set("proficiency_level", proficiencyLevel);
      formData.set("display_name", displayName);

      const result = await updateLearningProfile(formData);
      if (result.success) {
        toast.success("Profile updated.");
        return;
      }
      toast.error(result.error);
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
        toast.success("Gameplay preferences saved.");
        return;
      }
      toast.error(result.error);
    });
  }

  function handlePasswordSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        toast.success("Password updated.");
        return;
      }
      toast.error(result.error);
    });
  }

  function handleDeleteAccount(formData: FormData) {
    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if ("redirectTo" in result && result.redirectTo) {
        setDeleteRedirectTo(result.redirectTo);
      }
    });
  }

  return (
    <div className="grid w-full max-w-3xl gap-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Learning profile</CardTitle>
          <CardDescription>
            Update your Italian level and public display name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={profile.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-display-name">Username</Label>
            <Input
              id="settings-display-name"
              value={displayName}
              maxLength={24}
              placeholder="Used to sign in and shown to opponents"
              disabled={isPending}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-language">Language</Label>
              <Input
                id="settings-language"
                value={TARGET_LANGUAGE}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Proficiency level</Label>
              <Select
                value={proficiencyLevel}
                disabled={isPending}
                onValueChange={setProficiencyLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Level" />
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
                Saving...
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Gameplay</CardTitle>
          <CardDescription>Control sound and haptic feedback during matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div className="mb-3">
              <p className="text-sm font-medium">Volume</p>
              <p className="text-xs text-muted-foreground">
                Drag to turn match sounds up or down.
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
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Recent matches</CardTitle>
          <CardDescription>Your last 10 completed games.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed matches yet. Play a game to see history here.
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
                      vs {match.opponent_display_name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {match.opponent_type === "ghost" ? "Ghost" : "Real player"}
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
                      {resultLabel(match.result)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {match.user_score} — {match.opponent_score} · {match.language} ·{" "}
                    {match.level}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(match.played_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your sign-in password.</CardDescription>
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
              <Label htmlFor="current_password">Current password</Label>
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
              <Label htmlFor="new_password">New password</Label>
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
              <Label htmlFor="confirm_password">Confirm new password</Label>
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
              {isPending ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out or send feedback about the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={signOut}>
            <Button type="submit" variant="outline" className="min-h-11 w-full gap-2 sm:w-auto">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>

          <Button asChild variant="secondary" className="min-h-11 w-full gap-2 sm:w-auto">
            <a
              href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Language Quiz feedback")}`}
            >
              <Mail className="size-4" />
              Send feedback
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently remove your account, stats, and match history. This cannot be
            undone.
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
              <Label htmlFor="confirmation">Type DELETE to confirm</Label>
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
              {isPending ? "Deleting..." : "Delete my account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
