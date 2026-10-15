import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import {
  buildDailyReminderPayload,
  isReminderDue,
  mapWithConcurrency,
  sendPushToUser,
  type ReminderUser,
} from "@/lib/push";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CronUser = ReminderUser & { id: string };

/**
 * Users processed in parallel. Each one is an independent claim-then-send, so
 * the ceiling is about not opening too many push connections at once rather
 * than correctness.
 */
const USER_CONCURRENCY = 10;

/** Supabase returns at most 1,000 rows per request, so users are read in pages. */
const USER_PAGE_SIZE = 1_000;

/**
 * Runs about hourly. Notifies the users whose reminder is due (isReminderDue),
 * and claims each one with a conditional update before sending so two
 * overlapping triggers cannot both notify the same person.
 */
async function runDailyReminderCron(options: { dryRun: boolean }) {
  const admin = createAdminClient();
  const now = new Date();

  const users: CronUser[] = [];
  for (let from = 0; ; from += USER_PAGE_SIZE) {
    const { data, error } = await admin
      .from("users")
      .select("id, daily_reminder_hour, timezone, last_reminder_sent_at")
      .eq("daily_reminder_enabled", true)
      .eq("is_guest", false)
      .order("id")
      .range(from, from + USER_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    users.push(...(data as CronUser[]));
    if (data.length < USER_PAGE_SIZE) {
      break;
    }
  }

  const due = users.filter((user) => isReminderDue(user, now));

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

  const outcomes = await mapWithConcurrency(due, USER_CONCURRENCY, async (user) => {
    const empty = { sent: 0, failed: 0, pruned: 0, notified: 0, skipped: 0 };

    // Atomic claim: succeeds only while the row still holds the value read
    // above, so of two overlapping runs only one sends.
    const claim = admin
      .from("users")
      // `users` is not in the generated Database type.
      .update({ last_reminder_sent_at: now.toISOString() } as never)
      .eq("id", user.id);
    const { data: claimed, error: claimError } = await (user.last_reminder_sent_at
      ? claim.eq("last_reminder_sent_at", user.last_reminder_sent_at)
      : claim.is("last_reminder_sent_at", null)
    ).select("id");

    if (claimError) {
      return { ...empty, failed: 1 };
    }

    if (!claimed || claimed.length === 0) {
      return { ...empty, skipped: 1 };
    }

    try {
      const { data: streakRows } = await admin.rpc("match_streak", { p_user_id: user.id });
      const streak = streakRows?.[0];
      const streakAtRisk = streak && !streak.played_today ? streak.streak : 0;
      const result = await sendPushToUser(user.id, buildDailyReminderPayload(streakAtRisk));
      return {
        sent: result.sent,
        failed: result.failed,
        pruned: result.pruned,
        notified: result.sent > 0 ? 1 : 0,
        skipped: 0,
      };
    } catch {
      // One user's failure must not abandon the rest of the batch.
      return { ...empty, failed: 1 };
    }
  });

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  let notified = 0;
  let skippedByCooldown = 0;

  for (const outcome of outcomes) {
    sent += outcome.sent;
    failed += outcome.failed;
    pruned += outcome.pruned;
    notified += outcome.notified;
    skippedByCooldown += outcome.skipped;
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
