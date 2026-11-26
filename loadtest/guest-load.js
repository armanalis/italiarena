/**
 * k6 load test: signed-in guest players browsing the live app.
 *
 * setup() opens GUEST_ACCOUNTS guest accounts (Supabase anonymous sign-in +
 * the completeGuestProfile server action), then VUS virtual users share those
 * sessions and browse read-only app pages. No matchmaking, no answers posted.
 *
 * Supabase limits anonymous sign-ins per IP (~30/hour by default), so keep
 * GUEST_ACCOUNTS small. Every account stays in the database: delete them
 * afterwards (their ids are printed at the end of setup()).
 *
 * Run:  k6 run loadtest/guest-load.js
 * Env:  BASE_URL, SUPABASE_URL, SUPABASE_KEY, GUEST_ACTION_ID,
 *       GUEST_ACCOUNTS (default 20), VUS (default 200)
 *
 * GUEST_ACTION_ID is the server action id of completeGuestProfile. It changes
 * with every deploy; find it in the /guest page's JS chunks.
 */
import http from "k6/http";
import encoding from "k6/encoding";
import { check, sleep, group } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://italiarena.com";
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_KEY = __ENV.SUPABASE_KEY;
const GUEST_ACTION_ID = __ENV.GUEST_ACTION_ID;
const GUEST_ACCOUNTS = Number(__ENV.GUEST_ACCOUNTS || 20);
const VUS = Number(__ENV.VUS || 200);

const PAGES = ["/", "/leaderboard", "/stats", "/recent", "/wordle", "/word-wheel", "/articles"];
const pageTrends = Object.fromEntries(
  PAGES.map((p) => [p, new Trend(`page_${p === "/" ? "home" : p.slice(1).replace("-", "_")}`, true)])
);

export const options = {
  setupTimeout: "3m",
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: VUS },
        { duration: "3m", target: VUS },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_duration{kind:page}": ["p(95)<3000"],
    checks: ["rate>0.95"],
  },
};

const projectRef = () => SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0];

/** Same cookie format as @supabase/ssr: "base64-" + base64url(JSON), split at 3180 chars. */
function sessionCookieHeader(session) {
  const name = `sb-${projectRef()}-auth-token`;
  const value = "base64-" + encoding.b64encode(JSON.stringify(session), "rawurl");
  const MAX = 3180;
  if (value.length <= MAX) return `${name}=${value}`;
  const parts = [];
  for (let i = 0; i * MAX < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * MAX, (i + 1) * MAX)}`);
  }
  return parts.join("; ");
}

function createGuest() {
  const res = http.post(
    `${SUPABASE_URL}/auth/v1/signup`,
    JSON.stringify({ data: {}, gotrue_meta_security: {} }),
    { headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, tags: { kind: "setup" } }
  );
  if (res.status !== 200) {
    console.error(`anonymous sign-in failed: ${res.status} ${res.body}`);
    return null;
  }
  const s = res.json();
  const session = {
    access_token: s.access_token,
    token_type: s.token_type,
    expires_in: s.expires_in,
    expires_at: s.expires_at,
    refresh_token: s.refresh_token,
    user: s.user,
  };
  const cookie = sessionCookieHeader(session);

  const action = http.post(`${BASE_URL}/guest`, JSON.stringify(["Italian", "A1"]), {
    headers: {
      Cookie: cookie,
      "Next-Action": GUEST_ACTION_ID,
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
    },
    tags: { kind: "setup" },
  });
  const ok = action.status === 200 && action.body.includes('"error":null');
  if (!ok) {
    console.error(`completeGuestProfile failed: ${action.status} ${String(action.body).slice(0, 300)}`);
    return null;
  }
  return { id: s.user.id, cookie };
}

export function setup() {
  for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_KEY, GUEST_ACTION_ID })) {
    if (!v) throw new Error(`${k} is not set`);
  }
  const guests = [];
  for (let i = 0; i < GUEST_ACCOUNTS; i++) {
    const g = createGuest();
    if (g) guests.push(g);
    sleep(1);
  }
  console.log(`created ${guests.length}/${GUEST_ACCOUNTS} guest accounts`);
  console.log(`GUEST_IDS ${JSON.stringify(guests.map((g) => g.id))}`);
  if (guests.length === 0) throw new Error("no guest account could be created");
  return { guests };
}

export default function browse(data) {
  const guest = data.guests[(__VU - 1) % data.guests.length];
  const params = { headers: { Cookie: guest.cookie }, redirects: 0, tags: { kind: "page" } };

  group("browse", () => {
    for (const path of PAGES) {
      const res = http.get(`${BASE_URL}${path}`, { ...params, tags: { kind: "page", page: path } });
      pageTrends[path].add(res.timings.duration);
      check(res, {
        "status 200": (r) => r.status === 200,
        // A redirect to /login or /onboarding means the session was not accepted.
        "signed in (no redirect)": (r) => r.status < 300 || r.status >= 400,
      });
      sleep(1 + Math.random() * 2); // a player reads the page
    }
  });
}
