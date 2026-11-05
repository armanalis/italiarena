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

1. Write `migrations/<UTC yyyymmddhhmmss>_<name>.sql`. Start it with a comment that says what changes, why, and which test covers it. Prefer SQL that is safe to run twice (`create or replace`, `if not exists`). The file holds every query that runs, nothing on the side: wrap it in `begin;` … `commit;`, and end it with its own Migrations record (step 4) and a `select` that checks the result.
2. Run `npm run test:sql`. The tests build the database from the baseline and every migration, so they test exactly what production runs.
3. Run the whole file on production (paste it into the SQL Editor and Run, or psql), in timestamp order:
   - If the new app code needs it, run it **before** deploying.
   - If it removes something the live app still uses, run it **after** deploying, and say so in the file's first line.
4. The file records itself under Database → Migrations: its last insert adds `version` (the timestamp) and `name` to `supabase_migrations.schema_migrations` (`on conflict do nothing`, so a second run is harmless). The file in `migrations/` is the full text. Check the last result row the file returns. Migrations before `20261105102442` were recorded by hand, with `statements`.

Never change an old migration after it has run: write a new one. Production is whatever ran last, so a file that ran out of order can undo a fix (this happened before the 2026-11-04 `drift_fixes` migration).
