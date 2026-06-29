/**
 * Quick check that username uniqueness RPC + lookup fallbacks work.
 * Run: npx tsx scripts/check-username-uniqueness.ts
 */
import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function main() {
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, display_name, email")
    .not("display_name", "is", null)
    .limit(5);

  if (usersError) {
    console.error("Could not read users:", usersError.message);
    process.exit(1);
  }

  if (!users?.length) {
    console.log("No users with display_name found — cannot run live duplicate check.");
    process.exit(0);
  }

  const sample = users[0];
  const takenName = sample.display_name as string;
  const otherUserId = users.length > 1 ? users[1].id : "00000000-0000-0000-0000-000000000000";

  const { data: rpcTaken, error: rpcError } = await supabase.rpc("is_display_name_taken", {
    p_display_name: takenName,
    p_exclude_user_id: sample.id,
  });

  if (rpcError) {
    console.error("is_display_name_taken RPC missing or failed:", rpcError.message);
    console.error("Run supabase/username-unique-migration.sql in Supabase SQL Editor.");
    process.exit(1);
  }

  const { data: rpcFree, error: rpcFreeError } = await supabase.rpc(
    "is_display_name_taken",
    {
      p_display_name: takenName,
      p_exclude_user_id: otherUserId,
    }
  );

  if (rpcFreeError) {
    console.error("RPC exclude check failed:", rpcFreeError.message);
    process.exit(1);
  }

  const { data: resolveEmail } = await supabase.rpc("resolve_login_email", {
    p_identifier: takenName,
  });

  console.log("Sample username:", takenName);
  console.log("RPC taken (exclude owner):", rpcTaken, "expected: false");
  console.log("RPC taken (exclude other):", rpcFree, "expected: true");
  console.log("resolve_login_email:", resolveEmail ? "found" : "not found");

  const ok =
    rpcTaken === false &&
    rpcFree === true &&
    typeof resolveEmail === "string" &&
    resolveEmail.length > 0;

  if (!ok) {
    console.error("Username uniqueness checks did not match expectations.");
    process.exit(1);
  }

  console.log("Username uniqueness checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
