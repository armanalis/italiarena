/**
 * proxy.ts decides, for every page request, who goes to login, onboarding,
 * guest setup or the password reset form. Each case below is one visitor and
 * one page; Supabase is replaced by a fake fetch, so nothing leaves this machine.
 * Run: npx tsx scripts/test-proxy.ts
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proxytest.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

const SITE = "https://italiarena.com";

type AuthUser = { id: string; email?: string; email_confirmed_at?: string | null; is_anonymous?: boolean };
type Profile = { target_language: string | null; proficiency_level: string | null; is_guest: boolean; email: string };

const PLAYER: AuthUser = { id: "11111111-1111-4111-8111-111111111111", email: "p@x.it", email_confirmed_at: "2026-01-01T00:00:00Z" };
const UNVERIFIED: AuthUser = { ...PLAYER, email_confirmed_at: null };
const GUEST: AuthUser = { id: "22222222-2222-4222-8222-222222222222", is_anonymous: true };
const ONBOARDED: Profile = { target_language: "Italian", proficiency_level: "A1", is_guest: false, email: "p@x.it" };
const NEW_PLAYER: Profile = { ...ONBOARDED, target_language: null, proficiency_level: null };
const NEW_GUEST: Profile = { ...NEW_PLAYER, is_guest: true, email: `guest-${GUEST.id}@guest.local` };

/** What the fake Supabase answers for the visitor of the current case. */
let visitor: { user: AuthUser; profile: Profile } | null = null;

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.includes("/auth/v1/user")) {
    return visitor ? json(visitor.user) : json({ message: "no user" }, 401);
  }
  if (url.includes("/rest/v1/users")) {
    return json(visitor ? [visitor.profile] : []);
  }
  if (url.includes("/auth/v1/logout")) {
    return new Response(null, { status: 204 });
  }
  throw new Error(`unexpected request: ${url}`);
}) as typeof fetch;

/** The session cookie @supabase/ssr reads; the fake fetch decides who it belongs to. */
function sessionCookie(user: AuthUser) {
  const session = {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
  return `sb-proxytest-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

/** Where the proxy sends this visit: a path on this site, or "pass" when the page is served. */
async function visit(
  path: string,
  who: { user: AuthUser; profile: Profile } | null,
  extra: { cookie?: string; headers?: Record<string, string> } = {}
) {
  visitor = who;
  const cookie = [who ? sessionCookie(who.user) : null, extra.cookie].filter(Boolean).join("; ");
  const response = await proxy(
    new NextRequest(`${SITE}${path}`, { headers: { ...(cookie ? { cookie } : {}), ...extra.headers } })
  );
  const location = response.headers.get("location");
  if (!location) {
    assert.equal(response.headers.get("x-middleware-next"), "1", `${path}: neither served nor redirected`);
    return { to: "pass", response };
  }
  const target = new URL(location);
  assert.equal(target.origin, SITE, `${path}: redirected off this site, to ${location}`);
  return { to: `${target.pathname}${target.search}`, response };
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const player = { user: PLAYER, profile: ONBOARDED };
const newPlayer = { user: PLAYER, profile: NEW_PLAYER };
const newGuest = { user: GUEST, profile: NEW_GUEST };

async function main() {
  await check("signed out: the landing page is served, app pages go to login and remember the page", async () => {
    assert.equal((await visit("/", null)).to, "pass");
    assert.equal((await visit("/login", null)).to, "pass");
    assert.equal((await visit("/admin", null)).to, "/login");
    assert.equal((await visit("/match/abc", null)).to, "/login");
    const { to, response } = await visit("/stats?review=1", null);
    assert.equal(to, "/login");
    assert.equal(response.cookies.get("after_login")?.value, "/stats?review=1");
  });

  await check("a player who finished onboarding: app pages are served, login and onboarding go home", async () => {
    assert.equal((await visit("/", player)).to, "pass");
    assert.equal((await visit("/stats", player)).to, "pass");
    assert.equal((await visit("/login", player)).to, "/");
    assert.equal((await visit("/guest", player)).to, "/");
    assert.equal((await visit("/onboarding", player)).to, "/");
  });

  await check("a new player goes to onboarding first; a match in progress and in-app navigation are not interrupted", async () => {
    assert.equal((await visit("/", newPlayer)).to, "/onboarding");
    assert.equal((await visit("/stats", newPlayer)).to, "/onboarding");
    assert.equal((await visit("/login", newPlayer)).to, "/onboarding");
    assert.equal((await visit("/onboarding", newPlayer)).to, "pass");
    assert.equal((await visit("/match/abc", newPlayer)).to, "pass");
    assert.equal((await visit("/stats", newPlayer, { headers: { RSC: "1" } })).to, "pass");
  });

  await check("a new guest goes to guest setup, never to onboarding", async () => {
    assert.equal((await visit("/stats", newGuest)).to, "/guest");
    assert.equal((await visit("/onboarding", newGuest)).to, "/guest");
    assert.equal((await visit("/guest", newGuest)).to, "pass");
  });

  await check("an unconfirmed email is signed out and sent to login, where the page is served (no loop)", async () => {
    const unverified = { user: UNVERIFIED, profile: ONBOARDED };
    assert.equal((await visit("/stats", unverified)).to, "/login?error=email_not_verified");
    assert.equal((await visit("/login", unverified)).to, "pass");
  });

  await check("password reset: signed out means an expired link, a code goes to the callback, a session opens the form", async () => {
    assert.equal((await visit("/login/reset-password", null)).to, "/login?error=reset_link_expired");
    assert.equal(
      (await visit("/login/reset-password?code=abc", null)).to,
      "/auth/callback?code=abc&next=%2Flogin%2Freset-password"
    );
    assert.equal((await visit("/login/reset-password", player)).to, "pass");
    assert.equal((await visit("/login?error=reset_link_expired", player)).to, "/login/reset-password");
    assert.equal((await visit("/login?success=password_reset", player)).to, "pass");
  });

  await check("the remembered page opens once after login, only on this site and only after onboarding", async () => {
    const home = await visit("/", player, { cookie: "after_login=%2Fchallenge%2F1" });
    assert.equal(home.to, "/challenge/1");
    assert.equal(home.response.cookies.get("after_login")?.value, "", "the cookie is used once");
    assert.equal((await visit("/", player, { cookie: "after_login=%2F%2Fevil.example%2Fx" })).to, "/");
    assert.equal((await visit("/", newPlayer, { cookie: "after_login=%2Fchallenge%2F1" })).to, "/onboarding");
  });

  await check("a failed Google sign-in lands on login with its reason", async () => {
    assert.equal((await visit("/?error=x&error_code=flow_state_already_used", null)).to, "/login?error=auth_session_expired");
    assert.equal((await visit("/?error=invalid_request", null)).to, "/login?error=auth_callback_failed");
    assert.equal((await visit("/?error=admin_access_denied", null)).to, "pass");
  });

  console.log(`proxy OK (${passed} checks)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
