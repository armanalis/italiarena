# Contributing to Language Quiz

Thanks for taking the time to improve Language Quiz. This project is open source so the app can get better in public — but the live question pool and database schema are maintained separately and are **not** published in this repository.

## What you can contribute

- **UI and UX** — layout, mobile/PWA polish, animations, match flow clarity
- **Accessibility** — keyboard navigation, screen reader labels, contrast, touch targets
- **Bug fixes** — client state, match sync edge cases, error handling
- **Copy and i18n groundwork** — clearer labels, better empty states
- **Statistics and dashboard** — charts, mistake review, settings panels
- **Tests and tooling** — lint fixes, type safety, developer experience

## What needs discussion first

- **Database schema or SQL migrations** — not accepted via public PRs
- **Question content or scoring rule changes** — open an issue before building
- **Large refactors** — describe the problem and proposed approach in an issue first
- **New languages or major product direction** — talk to a maintainer before a big PR

## Getting started

1. Fork the repository and create a branch from `main`.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and add Supabase credentials you are allowed to use.
4. Run `npm run dev` and verify your change locally.
5. Run `npm run lint` and `npm run build` before submitting.

You do **not** need to run database migrations or seed questions to contribute to the frontend. If your change only touches UI or client logic, testing against the hosted app’s backend is usually enough.

## Pull request guidelines

- Keep PRs **focused** — one concern per pull request when possible.
- Describe **what** changed and **why** in the PR body.
- Add screenshots or a short screen recording for visible UI changes.
- Link related issues when applicable.

## Reporting bugs

Open a [GitHub issue](https://github.com/armanalis/language-quiz/issues) with:

- What you expected
- What happened instead
- Steps to reproduce
- Browser/device (especially for mobile or PWA issues)
- Screenshots or console errors if relevant

## Code style

- Match existing patterns in the file you are editing.
- Prefer small, readable changes over large rewrites.
- Use TypeScript types already defined in `types/`.
- Follow the project’s ESLint config (`npm run lint`).

## Questions

If you are unsure whether an idea fits, open an issue labeled as a question. That is always better than spending time on a PR that cannot be merged.

Thank you for helping make language practice feel less like homework.
