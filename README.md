# Italiarena

Italiarena is a live 1v1 Italian trivia game.

I moved to Turin as an international student and Italian was the hardest part — every app I tried felt like homework, so I stopped using them. Italiarena is the practice I actually wanted: quick, competitive matches instead of flashcards. It's for anyone landing in Italy and needing to pick up the language fast.

**[Play the live app →](https://italiarena.com)**

---

## Always open source

Italiarena is open source because learning tools are better when people can inspect the product, fix rough edges, and improve the experience together. Contributions are welcome.

The project is licensed under [MIT](LICENSE). If you want to contribute, start with [CONTRIBUTING.md](CONTRIBUTING.md), open an issue, or send a focused pull request.

The **hosted backend and question database are not part of this repository**. That keeps the live game fair and protects the content behind the product. You can still contribute meaningfully to the app layer — UI, accessibility, match flow, settings, statistics, and client-side behavior.

---

## What makes it different

| Idea | How it shows up in the app |
| --- | --- |
| **Short, focused matches** | Ten timed questions per round — grammar, vocabulary, fill-in-the-blank, and idioms |
| **Real opponents** | Matchmaking pairs players by Italian level (CEFR A1–C1) |
| **No dead waiting** | Play vs bot for an instant ghost match, or search for a human opponent |
| **Speed matters** | Faster correct answers score more; a tie after 10 questions goes to one sudden-death round |
| **Learn from mistakes** | Post-match review, targeted mistake practice, and optional AI-generated explanations (Groq) |
| **Community quality control** | Players can report bad questions; admins review a flagged/submission queue |
| **Push reminders** | Opt-in web push nudges players back for a daily match (Vercel Cron + service worker) |
| **Works like an app on your phone** | Add to home screen on iOS and Android for a full-screen experience |

Supported language: **Italian**.

---

## Architecture

Next.js (App Router) on Vercel, backed by Supabase (Postgres + Auth + Realtime). No separate game server — a `game_sessions` row **is** the match state, and both players' browsers just stay in sync with that row.

```
app/            Routes, layouts, server actions — auth, matchmaking, admin
components/     UI by feature: match, matchmaking, dashboard, statistics, admin, settings
hooks/          useGameLoop (pacing) + useServerMatchSync (staying in sync)
lib/            Scoring, bot simulation, match-sync protocol, AI explanations, auth
store/          Zustand store — all in-match state
utils/          Supabase clients (browser, server, middleware)
public/         Static assets, PWA icons, sound effects
```

Schema and migrations live outside this repo ([`supabase/README.md`](supabase/README.md)); the sync protocol that talks to them is fully readable in `lib/match-sync-client.ts` and `hooks/useServerMatchSync.ts`.

**How a match stays in sync, briefly:**

- One player's browser is the *sync leader* and writes "start round N" to the session row; both clients only trust what they read back from the database.
- State reaches the other player three ways at once — a realtime broadcast (fastest), a DB-change subscription that triggers an instant poll, and a 300ms poll as a fallback. Any one dropping a message just costs a poll cycle, not a stuck match.
- Round timing is stamped by Postgres, not either device — clients estimate their clock offset once at match start, so skewed phone clocks still flip screens at the same instant and scoring stays fair.
- Answers and scores are computed by RPCs on the server, not trusted from the client — a tampered client can't write a fake score or the opponent's answer.
- Server actions were pulled out of this hot path on purpose: one browser tab runs them in a single serial queue, so a slow one (like a report submit) used to stall the next round for minutes. Everything latency-sensitive now goes browser → Supabase directly.
- Tied after 10 questions → one sudden-death question, same sync mechanism.

---

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/armanalis/italiarena.git
cd italiarena
npm install
```

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Fill in the Supabase values for a project you are authorized to use. For most contributions, pointing at the hosted demo backend is enough to work on UI and client behavior — ask in an issue if you are unsure.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

```bash
npm run build              # production build
npm run lint               # ESLint
npm run audit:questions    # sanity-check the question bank for data issues
npm run test:match-resume  # exercise match-sync resume logic (refresh mid-round, etc.)
```

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) (App Router, Server Actions) |
| Backend | [Supabase](https://supabase.com/) — Postgres, Auth, Realtime, RPC functions |
| Client state | [Zustand](https://github.com/pmndrs/zustand) |
| UI | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) on [Radix](https://www.radix-ui.com/) primitives |
| AI explanations | [Groq](https://groq.com/) (Llama 3.1 8B) for optional post-match answer explanations |
| Push notifications | Web Push (`web-push`) + a Vercel Cron job for the daily reminder |
| Hosting | [Vercel](https://vercel.com/) |

---

## Deployment

The app is deployed on [Vercel](https://vercel.com/) at [italiarena.com](https://italiarena.com). Set `NEXT_PUBLIC_SITE_URL` to `https://italiarena.com`, plus `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the project environment. In Supabase → Authentication → URL configuration, set **Site URL** to `https://italiarena.com`, add `https://italiarena.com/auth/callback`, `https://italiarena.com/auth/confirm`, `https://italiarena.com/auth/confirm/pending`, and `https://italiarena.com/onboarding` to **Redirect URLs** (or use `https://italiarena.com/**`), and remove any old `language-quiz-one.vercel.app` entries.

For **local development**, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` and add these to Supabase **Redirect URLs** as well: `http://localhost:3000/**` (or at minimum `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, and `http://localhost:3000/auth/confirm/pending`).

### Auth emails (custom sender + templates)

Supabase’s built-in mailer sends from “Supabase Auth” and is rate-limited. For production, configure your own provider:

1. **SMTP** — Supabase → **Authentication** → **SMTP Settings** → enable custom SMTP.
   - **Sender email:** `support@italiarena.com`
   - **Sender name:** `Italiarena`
   - **Host / port / credentials:** from your provider (Resend, Google Workspace, Postmark, SendGrid, etc.)
   - Verify **SPF**, **DKIM**, and **DMARC** for `italiarena.com` in your provider’s DNS settings so messages land in the inbox.
2. **Templates** — Supabase → **Authentication** → **Email Templates**. Branded HTML for all six templates is in `supabase/email-templates/` (copy each file into the matching Supabase template). Suggested subjects:
   - Confirm signup — `Confirm your Italiarena account` → `confirm-signup.html`
   - Invite user — `You're invited to Italiarena` → `invite-user.html`
   - Magic link or OTP — `Sign in to Italiarena` → `magic-link.html`
   - Change email address — `Confirm your new Italiarena email` → `change-email.html`
   - Reset password — `Reset your Italiarena password` → `reset-password.html`
   - Reauthentication — `Your Italiarena verification code` → `reauthentication.html`
   Link-based templates should point to `{{ .RedirectTo }}auth/confirm/pending?token_hash={{ .TokenHash }}&type=…&next=/onboarding` (use `signup` for Confirm signup; for recovery use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login/reset-password`). `RedirectTo` is the signup origin (`http://localhost:3000/` locally or `https://italiarena.com/` in production). Inbox scanners are redirected to a confirmation button page before the one-time token is used.
3. After saving, send a test signup or password reset to confirm the sender shows as **Italiarena** / `support@italiarena.com` and links open `/auth/confirm/pending` (then continue via the button).
4. **Password reset timing** — Supabase → **Authentication** → **Providers / Email** (and **Sessions**): set **OTP / email link expiry** to at least `3600` seconds (1 hour), and **JWT expiry** to at least `3600`. The app also refreshes the recovery session while the user is on `/login/reset-password` so they have at least ~5 minutes to submit a new password.

Optional features (for example Ask AI) may require additional keys configured only on the hosted instance.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Good first areas: mobile layout, accessibility, copy, match UX, statistics views, and bug fixes in the client.

---

## License

See [LICENSE](LICENSE).
