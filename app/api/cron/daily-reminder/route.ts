import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { DAILY_REMINDER_PAYLOAD, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderUser = {
  id: string;
  daily_reminder_hour: number | null;
  timezone: string | null;
  last_reminder_sent_at: string | null;
};

const DEFAULT_REMINDER_HOUR = 18;

/**
 * A user is only eligible again once their last reminder is this old. Set just
 * under a day so a reminder still lands at the same local hour tomorrow, while
 * overlapping triggers within one day are rejected. Absorbs DST shifts too.
 */
const REMINDER_COOLDOWN_HOURS = 23;

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Current hour (0-23) in an IANA timezone. Returns null for a zone Postgres
 * accepted but this runtime's ICU data does not know.
 */
function localHourIn(timezone: string, now: Date): number | null {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      // h23 keeps midnight as 00; hour12:false can yield 24 on some ICU builds.
      hourCycle: "h23",
    }).format(now);

    const parsed = Number.parseInt(formatted, 10);
    if (!Number.isInteger(parsed)) return null;
    return parsed === 24 ? 0 : parsed;
  } catch {
    return null;
  }
}

function preferredHourOf(user: ReminderUser) {
  const hour = user.daily_reminder_hour;
  if (typeof hour !== "number" || !Number.isInteger(hour)) {
    return DEFAULT_REMINDER_HOUR;
  }
  return Math.min(23, Math.max(0, hour));
}

/** True when the user's own clock currently reads their chosen reminder hour. */
function isDueNow(user: ReminderUser, now: Date) {
  const zone = user.timezone?.trim() || "UTC";
  const localHour = localHourIn(zone, now) ?? localHourIn("UTC", now);
  if (localHour === null) return false;
  return localHour === preferredHourOf(user);
}

/**
 * Runs hourly. Notifies only the users whose local time matches their preferred
 * hour, and claims each one with a conditional update before sending so two
 * overlapping triggers cannot both notify the same person.
 */
async function runDailyReminderCron(options: { dryRun: boolean }) {
  const admin = createServiceClient();
  const now = new Date();
  const cooldownCutoff = new Date(
    now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("users")
    .select("id, daily_reminder_hour, timezone, last_reminder_sent_at")
    .eq("daily_reminder_enabled", true)
    .eq("is_guest", false);

  if (error) {
    throw new Error(error.message);
  }

  const users = (data ?? []) as ReminderUser[];
  const due = users.filter((user) => isDueNow(user, now));

  if (options.dryRun) {
    return {
      dryRun: true,
      checked: users.length,
      matched: due.length,
      sent: 0,
      failed: 0,
      pruned: 0,
      skippedByCooldown: 0,
      dueUserIds: due.map((user) => user.id),
    };
  }

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  let notified = 0;
  let skippedByCooldown = 0;

  for (const user of due) {
    // Atomic claim: only succeeds if nobody notified this user recently.
    const { data: claimed, error: claimError } = await admin
      .from("users")
      .update({ last_reminder_sent_at: now.toISOString() })
      .eq("id", user.id)
      .or(
        `last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cooldownCutoff}`
      )
      .select("id");

    if (claimError) {
      failed += 1;
      continue;
    }

    if (!claimed || claimed.length === 0) {
      skippedByCooldown += 1;
      continue;
    }

    const result = await sendPushToUser(user.id, DAILY_REMINDER_PAYLOAD);
    sent += result.sent;
    failed += result.failed;
    pruned += result.pruned;
    if (result.sent > 0) notified += 1;
  }

  return {
    checked: users.length,
    matched: due.length,
    notified,
    sent,
    failed,
    pruned,
    skippedByCooldown,
  };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dryRun =
    new URL(request.url).searchParams.get("dry") === "1";

  try {
    const summary = await runDailyReminderCron({ dryRun });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily reminder cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
