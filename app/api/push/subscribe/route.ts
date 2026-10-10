import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isGuestAuthUser } from "@/lib/guest-auth";
import { isPushServiceEndpoint, MAX_SUBSCRIPTIONS_PER_USER } from "@/lib/push";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  timezone?: string;
  dailyReminderEnabled?: boolean;
  dailyReminderHour?: number;
};

function isValidTimezone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (isGuestAuthUser(user)) {
    return NextResponse.json(
      { error: "Guest accounts cannot enable notifications." },
      { status: 403 }
    );
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Missing push subscription fields." },
      { status: 400 }
    );
  }

  if (!isPushServiceEndpoint(endpoint)) {
    return NextResponse.json(
      { error: "This browser's push service is not supported." },
      { status: 400 }
    );
  }

  const timezone =
    typeof body.timezone === "string" && isValidTimezone(body.timezone)
      ? body.timezone
      : "UTC";

  const hour =
    typeof body.dailyReminderHour === "number" &&
    Number.isInteger(body.dailyReminderHour) &&
    body.dailyReminderHour >= 0 &&
    body.dailyReminderHour <= 23
      ? body.dailyReminderHour
      : 18;

  const userAgent = request.headers.get("user-agent");

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { data: devices } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const oldDeviceIds = (devices ?? [])
    .slice(MAX_SUBSCRIPTIONS_PER_USER)
    .map((device) => device.id);

  if (oldDeviceIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", oldDeviceIds);
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({
      daily_reminder_enabled: body.dailyReminderEnabled !== false,
      daily_reminder_hour: hour,
      timezone,
    })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
