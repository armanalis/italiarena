# Database (private)

SQL migrations and schema for Italiarena are **not published** in this public repository.

The hosted backend — auth, matchmaking, question pool, reports, and admin workflows — runs on a private Supabase project tied to the live deployment.

If you are contributing to the **app layer** (UI, client logic, match flow), you do not need access to these files. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Maintainers keep migration files locally for development and production updates.

## Layout (private, git-ignored)

- `migrations/` — the database structure. `<timestamp>_baseline.sql` is migration #1: the whole structure as of 2026-10-31. Every later change is a new `<timestamp>_<name>.sql` after it.
- `archive/` — two kinds of files:
  - **Content loaders** (word lists, Word Wheel clues, article nouns, Picture Duel pictures): run them to load or refresh content. They are safe to run again.
  - **Old migrations** that built the baseline: reference only. Never run them on the live database; they would bring back old versions of functions.
- `real-schema.mjs` — builds the real database (baseline + every migration) in memory for the tests.
- `*.test.mjs` — the database tests: `npm run test:sql`.

## Adding a migration (maintainers)

1. Write `migrations/<UTC yyyymmddhhmmss>_<name>.sql`. Start it with a comment that says what changes, why, and which test covers it. Prefer SQL that is safe to run twice (`create or replace`, `if not exists`).
2. Run `npm run test:sql`. The tests build the database from the baseline and every migration, so they test exactly what production runs.
3. Run the file on production (SQL Editor or psql), in timestamp order:
   - If the new app code needs it, run it **before** deploying.
   - If it removes something the live app still uses, run it **after** deploying, and say so in the file's first line.
4. Record it under Database → Migrations: insert a row into `supabase_migrations.schema_migrations` with `version` (the timestamp), `name`, and `statements` (the whole file as one array item).

Never change an old migration after it has run: write a new one. Production is whatever ran last, so a file that ran out of order can undo a fix (this happened before the 2026-11-04 `drift_fixes` migration).
