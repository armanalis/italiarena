/** Server-side Web Push helpers (VAPID + web-push). Chat can reuse sendPushToUser later. */

import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
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
  "Clash with someone while practicing your new language.",
  "Someone out there is ready to be beaten. Are you?",
  "Two minutes, one clash. Your future self will thank you.",
  "A language won't practice itself. Go find an opponent.",
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
    url: "/matchmaking",
    tag: "daily-reminder",
  };
}

/** One row of get_my_streaks / game_streaks. */
export type GameStreak = {
  game: "arena" | "wordle" | "passaparola" | "articles";
  streak: number;
  played_today: boolean;
};

const STREAK_REMINDERS: Record<GameStreak["game"], { url: string; body: (days: number) => string }> = {
  arena: {
    url: "/matchmaking",
    body: (days) => `Keep your ${days}-day Arena streak alive: one quick match is enough.`,
  },
  wordle: {
    url: "/wordle",
    body: (days) => `Keep your ${days}-day Wordle streak alive: today's word is waiting.`,
  },
  passaparola: {
    url: "/word-wheel",
    body: (days) => `Keep your ${days}-day Word Wheel streak alive: five minutes is enough.`,
  },
  articles: {
    url: "/articles",
    body: (days) => `Keep your ${days}-day articles streak alive: one 60-second Sprint is enough.`,
  },
};

/**
 * One reminder per streak that today's play would extend, each opening its
 * own game (separate tags, so they do not replace each other). The usual
 * reminder when no streak is at risk.
 */
export function buildDailyReminderPayloads(streaks: readonly GameStreak[]): PushPayload[] {
  const atRisk = streaks.filter(
    ({ game, streak, played_today }) => streak > 0 && !played_today && game in STREAK_REMINDERS
  );
  if (atRisk.length === 0) {
    return [buildDailyReminderPayload()];
  }
  return atRisk.map(({ game, streak }) => ({
    title: APP_NAME,
    body: STREAK_REMINDERS[game].body(streak),
    url: STREAK_REMINDERS[game].url,
    tag: `daily-reminder-${game}`,
  }));
}

export type ReminderUser = {
  daily_reminder_hour: number | null;
  timezone: string | null;
  last_reminder_sent_at: string | null;
};

const DEFAULT_REMINDER_HOUR = 18;

/** Local date (YYYY-MM-DD) and hour (0-23); null for a zone this runtime does not know. */
function localTime(timezone: string, at: Date): { date: string; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      // h23 keeps midnight as 00; hour12:false can yield 24 on some ICU builds.
      hourCycle: "h23",
    }).formatToParts(at);
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    const hour = Number(part("hour"));
    return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: hour === 24 ? 0 : hour };
  } catch {
    return null;
  }
}

/**
 * Due once the player's clock has reached their chosen hour, if nothing was
 * sent yet on their local day. "At or after", not "during", because the
 * hourly trigger (GitHub Actions) really runs only every few hours.
 */
export function isReminderDue(user: ReminderUser, now: Date) {
  const chosen = user.timezone?.trim() || DEFAULT_TIMEZONE;
  const zone = localTime(chosen, now) ? chosen : DEFAULT_TIMEZONE;
  const local = localTime(zone, now);
  const hour = user.daily_reminder_hour;
  const preferred = Number.isInteger(hour) ? Math.min(23, Math.max(0, hour!)) : DEFAULT_REMINDER_HOUR;
  if (!local || local.hour < preferred) {
    return false;
  }
  return (
    !user.last_reminder_sent_at ||
    localTime(zone, new Date(user.last_reminder_sent_at))?.date !== local.date
  );
}

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// The server POSTs every notification to this address, so it must be a real
// browser push service; any other host would let a player aim our servers at
// arbitrary sites.
const PUSH_SERVICE_HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

/** Newest devices kept per player; older ones are usually dead browsers. */
export const MAX_SUBSCRIPTIONS_PER_USER = 10;

export function isPushServiceEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === "https:" &&
      PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname))
    );
  } catch {
    return false;
  }
}

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
    url: payload.url ?? "/",
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

/**
 * Runs tasks with a cap on how many are in flight at once. Unbounded
 * Promise.all would open one socket per subscription, which a large audience
 * turns into a self-inflicted burst against FCM and Apple.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/** Devices per user sent in parallel. Users rarely have more than a handful. */
const DEVICE_CONCURRENCY = 5;

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

  const results = await mapWithConcurrency(rows, DEVICE_CONCURRENCY, (row) =>
    sendPushToSubscription(row, payload)
  );

  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const result of results) {
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.gone) pruned += 1;
    }
  }

  return { sent, failed, pruned };
}
