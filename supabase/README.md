# Database (private)

SQL migrations and schema for Italiarena are **not published** in this public repository.

The hosted backend — auth, matchmaking, question pool, reports, and admin workflows — runs on a private Supabase project tied to the live deployment.

If you are contributing to the **app layer** (UI, client logic, match flow), you do not need access to these files. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Maintainers keep migration files locally for development and production updates.

## Layout (private, git-ignored)

- `migrations/` — `<timestamp>_baseline.sql` is migration #1: the full database structure as of 2026-10-31. Every later change is a new `<timestamp>_<name>.sql` after it, recorded in Supabase under Database → Migrations.
- `archive/` — the older files that built the baseline, kept for reference only. Do not run them on the live database.
