# Italiarena

Italiarena is a live 1v1 Italian trivia game for learners.

It is built for people who want practice that feels competitive and social — not another static flashcard app. The goal is simple: jump into a short match, answer timed questions against a real person or a bot, and actually remember what you got wrong.

I started Italiarena because most language tools feel like homework. This project is my attempt to build the kind of Italian practice I would actually open every day: fast rounds, clear feedback, and enough pressure to stay focused without burning out.

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
| **Speed matters** | Faster correct answers score more; ties break on response time |
| **Learn from mistakes** | Post-match review, mistake practice, and optional AI explanations |
| **Community quality control** | Players can report bad questions; admins review the queue |
| **Works like an app on your phone** | Add to home screen on iOS and Android for a full-screen experience |

Supported language: **Italian**.

---

## Project structure

```
app/            Next.js routes, layouts, and server actions
components/     UI, match loop, dashboard, statistics, admin tools
hooks/          Client hooks (game loop, audio)
lib/            Auth helpers, scoring, bots, shared constants
store/          Zustand match state (persisted on the client)
utils/          Supabase browser, server, and middleware clients
public/         Static assets and match sound effects
```

Database schema and migrations live outside this public repo. See [`supabase/README.md`](supabase/README.md).

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
npm run build    # production build
npm run lint     # ESLint
```

---

## Deployment

The app is deployed on [Vercel](https://vercel.com/) at [italiarena.com](https://italiarena.com). Set `NEXT_PUBLIC_SITE_URL` to `https://italiarena.com`, plus `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the project environment. In Supabase → Authentication → URL configuration, set **Site URL** to `https://italiarena.com`, add `https://italiarena.com/auth/callback`, `https://italiarena.com/auth/confirm`, `https://italiarena.com/auth/confirm/pending`, and `https://italiarena.com/onboarding` to **Redirect URLs** (or use `https://italiarena.com/**`), and remove any old `language-quiz-one.vercel.app` entries.

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
   Link-based templates should point to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…&next={{ .RedirectTo }}` (use `signup` for Confirm signup, `recovery` for Reset password, and `email`, `invite`, `magiclink`, or `email_change` for the others). Inbox scanners are redirected to a confirmation button page before the one-time token is used.
3. After saving, send a test signup or password reset to confirm the sender shows as **Italiarena** / `support@italiarena.com` and links open `/auth/confirm/pending` (then continue via the button).

Optional features (for example Ask AI) may require additional keys configured only on the hosted instance.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Good first areas: mobile layout, accessibility, copy, match UX, statistics views, and bug fixes in the client.

---

## License

See [LICENSE](LICENSE).
