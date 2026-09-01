/** Server-side Web Push helpers (VAPID + web-push). Chat can reuse sendPushToUser later. */

import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

/**
 * Reminder copy pool. One is picked at random per send so a daily notification
 * does not read identically every day and get tuned out.
 */
export const DAILY_REMINDER_MESSAGES = [
  "Clash with someone while practicing your Italian.",
  "Someone out there is ready to be beaten. Are you?",
  "Two minutes, one clash. Your Italian will thank you.",
  "Your Italian won't practice itself. Go find an opponent.",
  "Andiamo! One quick match is all today needs.",
] as const;

export function pickDailyReminderMessage() {
  const index = Math.floor(Math.random() * DAILY_REMINDER_MESSAGES.length);
  return DAILY_REMINDER_MESSAGES[index] ?? DAILY_REMINDER_MESSAGES[0];
}

/** A fresh reminder payload with randomly chosen copy. */
export function buildDailyReminderPayload(): PushPayload {
  return {
    title: APP_NAME,
    body: pickDailyReminderMessage(),
    url: "/dashboard/matchmaking",
    tag: "daily-reminder",
  };
}

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ?? `mailto:${SUPPORT_EMAIL}`;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

function toWebPushSubscription(row: PushSubscriptionRow) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

/** Push service host only — the full endpoint is a delivery credential. */
function safeHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

function isGoneError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToSubscription(
  row: PushSubscriptionRow,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> {
  ensureVapidConfigured();

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "italiarena",
    icon: payload.icon ?? "/icon",
    badge: payload.badge ?? "/icon",
  });

  try {
    await webpush.sendNotification(toWebPushSubscription(row), body);
    return { ok: true };
  } catch (error) {
    const gone = isGoneError(error);
    if (gone) {
      const admin = createAdminClient();
      await admin.from("push_subscriptions").delete().eq("id", row.id);
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    const body = (error as { body?: unknown }).body;
    const message =
      error instanceof Error ? error.message : "Failed to send push notification.";

    if (!gone) {
      // A live subscription that refused delivery. Without this the caller only
      // sees a failure count and the cause is unrecoverable after the fact.
      console.error("[push] delivery failed", {
        subscriptionId: row.id,
        pushService: safeHost(row.endpoint),
        statusCode,
        body: typeof body === "string" ? body.slice(0, 500) : undefined,
        message,
      });
    }

    return { ok: false, gone, error: message };
  }
}

/** Send a push to every stored device for a user. Safe to call from chat later. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PushSubscriptionRow[];
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const row of rows) {
    const result = await sendPushToSubscription(row, payload);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.gone) pruned += 1;
    }
  }

  return { sent, failed, pruned };
}
