"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDailyReminderPreferences } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
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
import { APP_NAME } from "@/lib/legal";
import {
  getBrowserTimezone,
  getExistingPushSubscription,
  isIosDevice,
  isPushSupported,
  isStandaloneDisplay,
  serializePushSubscription,
  subscribeToPush,
} from "@/lib/push-client";
import { cn } from "@/lib/utils";

type NotificationsSettingsCardProps = {
  initialEnabled: boolean;
  initialHour: number;
};

const REMINDER_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatReminderHour(hour: number) {
  const safeHour = Math.min(23, Math.max(0, Math.trunc(hour)));
  const date = new Date();
  date.setHours(safeHour, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

export function NotificationsSettingsCard({
  initialEnabled,
  initialHour,
}: NotificationsSettingsCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hour, setHour] = useState(
    Number.isInteger(initialHour) && initialHour >= 0 && initialHour <= 23
      ? initialHour
      : 18
  );
  const [isPending, startTransition] = useTransition();

  function enableReminder() {
    startTransition(async () => {
      if (!isPushSupported()) {
        toast.error("This browser does not support push notifications.");
        return;
      }

      if (isIosDevice() && !isStandaloneDisplay()) {
        toast.error(
          `On iPhone, add ${APP_NAME} to your Home Screen first, then open it from there to enable alerts.`
        );
        return;
      }

      try {
        const subscription = await subscribeToPush();
        const serialized = serializePushSubscription(subscription);
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...serialized,
            timezone: getBrowserTimezone(),
            dailyReminderEnabled: true,
            dailyReminderHour: hour,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Could not enable daily reminder.");
        }

        setEnabled(true);
        toast.success(
          "Daily reminder enabled. You'll get one clash nudge per day."
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not enable daily reminder.";
        toast.error(message);
      }
    });
  }

  function disableReminder() {
    startTransition(async () => {
      try {
        const existing = await getExistingPushSubscription().catch(() => null);
        if (existing) {
          const serialized = serializePushSubscription(existing);
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: serialized.endpoint,
              disableDailyReminder: true,
            }),
          });
          await existing.unsubscribe().catch(() => undefined);
        }

        const result = await updateDailyReminderPreferences({ enabled: false });
        if (!result.success) {
          throw new Error(result.error);
        }

        setEnabled(false);
        toast.success("Daily reminder turned off.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not disable daily reminder.";
        toast.error(message);
      }
    });
  }

  function changeReminderHour(nextHour: number) {
    const previousHour = hour;
    setHour(nextHour);

    if (!enabled) {
      return;
    }

    startTransition(async () => {
      const result = await updateDailyReminderPreferences({
        hour: nextHour,
        timezone: getBrowserTimezone(),
      });

      if (!result.success) {
        setHour(previousHour);
        toast.error(result.error);
        return;
      }

      toast.success(
        `Reminder time updated to ${formatReminderHour(nextHour)}.`
      );
    });
  }

  function sendTest() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/push/test", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Could not send a test notification."
          );
        }
        toast.success("Test notification sent. Check your notification tray.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not send a test notification.";
        toast.error(message);
      }
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" />
          </div>
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription className="mt-1.5">
              Get a daily clash reminder on your phone or computer — even when{" "}
              {APP_NAME} is closed.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PreferenceToggle
          label="Daily practice reminder"
          description='Clash with someone while practicing your Italian.'
          checked={enabled}
          disabled={isPending}
          onChange={(value) => {
            if (value) enableReminder();
            else disableReminder();
          }}
        />

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
          <Label htmlFor="daily-reminder-hour">Preferred reminder time</Label>
          <p className="text-xs text-muted-foreground">
            Saved to your account. On the free hosting plan, reminders are
            sent once per day for everyone (around 8:00 PM Turkey time / 5:00
            PM UTC). Your preferred hour is kept for when hourly delivery is
            available.
          </p>
          <Select
            value={String(hour)}
            disabled={isPending}
            onValueChange={(value) => changeReminderHour(Number(value))}
          >
            <SelectTrigger id="daily-reminder-hour" className="min-h-11">
              <SelectValue placeholder="Choose a time" />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_HOURS.map((optionHour) => (
                <SelectItem key={optionHour} value={String(optionHour)}>
                  {formatReminderHour(optionHour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {enabled ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={sendTest}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Working...
              </>
            ) : (
              "Send a test notification"
            )}
          </Button>
        ) : null}

        {isIosDevice() && !isStandaloneDisplay() ? (
          <p className="text-xs text-muted-foreground">
            On iPhone, install {APP_NAME} to your Home Screen (see the guide
            above), then open it from the icon to enable out-of-app alerts.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
