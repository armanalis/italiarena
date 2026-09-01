import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildDailyReminderPayload, sendPushToUser } from "@/lib/push";
import { isGuestAuthUser } from "@/lib/guest-auth";

/** Sends one test notification to the signed-in user's devices. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (isGuestAuthUser(user)) {
    return NextResponse.json(
      { error: "Guest accounts cannot use notifications." },
      { status: 403 }
    );
  }

  try {
    const result = await sendPushToUser(user.id, {
      ...buildDailyReminderPayload(),
      tag: "daily-reminder-test",
    });

    if (result.sent === 0) {
      return NextResponse.json(
        {
          error:
            result.failed > 0
              ? "Could not deliver a test notification. Try enabling the reminder again."
              : "No push subscription found for this device. Enable the daily reminder first.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send test notification.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
