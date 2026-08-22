import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_AFTER_HOURS = 1;

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}

/**
 * Matchmaking only abandons a user's OWN zombie "waiting" lobby the next
 * time they search — there is no sweep for sessions nobody ever comes back
 * to (closed tab, crashed match, phone died mid-match). Left unbounded,
 * game_sessions grows forever with dead rows.
 *
 * Vercel Hobby only allows one cron run per day (see daily-reminder cron),
 * so this runs on the same once-daily cadence rather than something tighter
 * like every 30 minutes.
 */
async function runStaleSessionCleanup() {
  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("game_sessions")
    .update({ status: "abandoned" })
    .in("status", ["waiting", "active"])
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return { abandoned: data?.length ?? 0 };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runStaleSessionCleanup();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stale session cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
