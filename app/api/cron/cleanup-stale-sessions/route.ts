import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A lobby stays open for an hour. */
const STALE_WAITING_HOURS = 1;
/** A match joined in the lobby's last minute still gets to finish. */
const STALE_ACTIVE_HOURS = 2;

/**
 * Also deletes practice article Sprints left unfinished for a day, ends
 * Picture Duels both players left, and purges old abandoned matches and
 * guests gone for 30 days (purge_stale_rows in the database).
 *
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
  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const abandonOlder = (status: "waiting" | "active", hours: number) =>
    admin
      .from("game_sessions")
      .update({ status: "abandoned" })
      .eq("status", status)
      .lt("created_at", hoursAgo(hours))
      .select("id");

  const [waiting, active] = await Promise.all([
    abandonOlder("waiting", STALE_WAITING_HOURS),
    abandonOlder("active", STALE_ACTIVE_HOURS),
  ]);
  const error = waiting.error ?? active.error;

  if (error) {
    throw new Error(error.message);
  }

  const { data: purged, error: purgeError } = await admin.rpc("purge_stale_rows");

  if (purgeError) {
    throw new Error(purgeError.message);
  }

  // Practice Sprints left halfway (each row keeps 120 card ids) are never read
  // again: nothing was scored and they carry no answers.
  const { count: practiceRunsDeleted, error: runsError } = await admin
    .from("article_runs")
    .delete({ count: "exact" })
    .eq("scored", false)
    .is("finished_at", null)
    .lt("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (runsError) {
    throw new Error(runsError.message);
  }

  // Picture Duels both players left: no screen asks the server to end them,
  // so end them by the game's own rule (picture_duel_settle: the player whose
  // clock ran out loses). A clock holds at most 60 s, so 2 minutes is safe.
  const { data: staleDuels, error: duelsError } = await admin
    .from("picture_duels")
    .select("id")
    .eq("status", "active")
    .lt("turn_started_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .returns<{ id: string }[]>();

  if (duelsError) {
    throw new Error(duelsError.message);
  }

  let duelsEnded = 0;
  for (const duel of staleDuels ?? []) {
    const { data: ended } = await admin.rpc("picture_duel_settle", { p_id: duel.id });
    if (ended) duelsEnded += 1;
  }

  return {
    abandoned: (waiting.data?.length ?? 0) + (active.data?.length ?? 0),
    sessionsDeleted: purged?.sessions ?? 0,
    guestsDeleted: purged?.guests ?? 0,
    practiceRunsDeleted: practiceRunsDeleted ?? 0,
    duelsEnded,
  };
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
