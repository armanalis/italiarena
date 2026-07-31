import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { DAILY_REMINDER_PAYLOAD, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderUser = {
  id: string;
};

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
 * Vercel Hobby only allows one cron run per day, so we notify every opted-in
 * user on that daily pass. Preferred hour is still stored for a future
 * hourly schedule (Pro plan or external cron).
 */
async function runDailyReminderCron() {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("daily_reminder_enabled", true)
    .eq("is_guest", false);

  if (error) {
    throw new Error(error.message);
  }

  const users = (data ?? []) as ReminderUser[];
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const user of users) {
    const result = await sendPushToUser(user.id, DAILY_REMINDER_PAYLOAD);
    sent += result.sent;
    failed += result.failed;
    pruned += result.pruned;
  }

  return {
    matched: users.length,
    sent,
    failed,
    pruned,
    checked: users.length,
  };
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
