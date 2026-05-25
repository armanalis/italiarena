# Language Quiz

Real-time, 1v1 language trivia for learners. Players sign in, pick a target language and CEFR level, then choose **Play vs real user** (live matchmaking) or **Play vs bot** (instant ghost match).

Built with **Next.js** and **Supabase**.

---

## What it does

Language Quiz is a multiplayer learning game, not a static flashcard app. Every match is a timed duel: ten questions across grammar, vocabulary, fill-in-the-blank, and idioms, with points awarded for both accuracy and speed.

| Feature | Description |
| --- | --- |
| **Bracket matchmaking** | Pairs players by target language and proficiency level (A1–C1) |
| **Live sync** | Supabase Realtime broadcasts keep both clients in lockstep during a match |
| **Real-player search** | Waits up to 15 seconds for a human opponent; if none joins, returns to the dashboard |
| **Play vs bot** | Separate mode that starts a ghost opponent immediately — no waiting room |
| **Speed scoring** | Faster correct answers earn more points; ties break on average response time |
| **Question quality** | Players can flag bad questions; three reports auto-quarantine a item for admin review |
| **Resilient UX** | Global error boundary clears stale match state and retries on connection drops |

Supported languages: **English**, **Italian**, **Spanish**.

---

## How a match works

There are two entry points from the dashboard:

### Play vs real user

```mermaid
sequenceDiagram
  participant P as Player
  participant App as Next.js App
  participant SB as Supabase
  participant O as Human opponent

  P->>App: Find real opponent
  App->>SB: searchForMatch (join open lobby or create waiting session)
  alt Human joins within 15s
    SB-->>App: Session active
    App->>SB: get_random_questions (10-question playlist)
    loop Each round
      P->>App: Lock answer
      App->>SB: Broadcast answer_locked
      SB-->>O: Realtime event
      App->>App: Score round, reveal result
    end
    App->>P: Match finished — win / loss / tie
  else No human within 15s
    App->>SB: cancelMatchSearch (abandon session)
    App->>P: Return to dashboard — "No game found"
  end
```

### Play vs bot

```mermaid
sequenceDiagram
  participant P as Player
  participant App as Next.js App
  participant SB as Supabase

  P->>App: Play vs ghost
  App->>SB: Create session + startGhostMatch
  App->>SB: get_random_questions (10-question playlist)
  loop Each round
    P->>App: Lock answer
    App->>App: Simulate ghost answer + score round
  end
  App->>P: Match finished — win / loss / tie
```

Each playlist is built server-side and avoids recently seen questions so repeat matches stay fresh.

---

## Tech stack

- **[Next.js 14](https://nextjs.org/)** — App Router, Server Components, Server Actions
- **[Supabase](https://supabase.com/)** — Auth, Postgres, Row Level Security, Realtime
- **[Zustand](https://zustand.docs.pmnd.rs/)** — Persisted in-match game state
- **[Tailwind CSS](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** — UI components
- **[Vercel](https://vercel.com/)** — Deployment with edge-cached static assets

---

## Project structure

```
app/                  # Routes, layouts, server actions
components/           # UI, match loop, matchmaking lobby, admin tools
hooks/                # Game loop, audio
store/                # Zustand match state (persisted)
lib/                  # Auth, scoring, bots, constants
utils/supabase/       # Browser, server, and middleware clients
supabase/             # SQL migrations (schema, game tables, matchmaking, reports, indexes)
public/sounds/        # Match SFX (reveal, click, correct, incorrect)
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project
- npm

### 1. Clone and install

```bash
git clone https://github.com/armanalis/language-quiz
cd language-quiz
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find both values in Supabase → **Project Settings → API**.

### 3. Database setup

Run these SQL files **in order** in the Supabase SQL Editor:

1. `supabase/schema.sql` — user profiles and auth triggers
2. `supabase/database.sql` — questions, sessions, stats, match RPCs
3. `supabase/matchmaking-migration.sql` — language/level on sessions, join policies
4. `supabase/match-questions-migration.sql` — 10-question playlist and tiebreaker RPCs
5. `supabase/settings-migration.sql` — display names, preferences, match history
6. `supabase/reports-migration.sql` — question flagging and admin role
7. `supabase/performance-indexes.sql` — production query indexes

Then enable Realtime for matchmaking:

- Supabase → **Database → Publications**
- Add `game_sessions` to the `supabase_realtime` publication

### 4. Seed questions

Add rows to `questions_active` for each `(language, level, category)` combination you want to support. Categories must be one of:

- `grammar`
- `vocabulary`
- `fill-in-the-blank`
- `idioms`

The `get_random_questions` RPC builds a 10-question playlist (3 + 3 + 3 + 1 per category).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

Deploy to Vercel and add the same environment variables in the project settings. The included `vercel.json` configures long-lived edge caching for game audio and other static assets.

```bash
npm run build   # verify production build locally
npm run lint    # ESLint
```

---

## Admin access

After running `supabase/reports-migration.sql`, promote a user in the SQL Editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

Admins can review quarantined questions at `/admin`.

---

## Scoring reference

| Response time | Points (if correct) |
| --- | --- |
| Under 5s | 140 |
| 5–10s | 130 |
| 10–15s | 120 |
| 15–25s | 100 |
| Over 25s or wrong | 0 |

Round timer: **25 seconds**. Match length: **10 questions**.

---

## License

Private project — all rights reserved unless otherwise specified.
