import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { DAILY_REMINDER_PAYLOAD, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderUser = {
  id: string;
  daily_reminder_hour: number;
  timezone: string;
};

function localHourNow(timeZone: string, now = new Date()): number | null {
  try {
    const hourPart = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour");

    if (!hourPart) return null;
    const hour = Number(hourPart.value);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
    return hour;
  } catch {
    return null;
  }
}

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

async function runDailyReminderCron() {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("users")
    .select("id, daily_reminder_hour, timezone")
    .eq("daily_reminder_enabled", true)
    .eq("is_guest", false);

  if (error) {
    throw new Error(error.message);
  }

  const users = (data ?? []) as ReminderUser[];
  const now = new Date();
  let matched = 0;
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const user of users) {
    const hour = localHourNow(user.timezone || "UTC", now);
    if (hour === null || hour !== user.daily_reminder_hour) {
      continue;
    }

    matched += 1;
    const result = await sendPushToUser(user.id, DAILY_REMINDER_PAYLOAD);
    sent += result.sent;
    failed += result.failed;
    pruned += result.pruned;
  }

  return { matched, sent, failed, pruned, checked: users.length };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runDailyReminderCron();
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
