/**
 * The landing demo in Italian: each question's help line and, for meaning
 * questions, its options (keyed by question id; lib/landing-demo-questions.ts).
 * Server only, like the pool. Same shape as landing-demo-questions-tr.ts.
 * Empty until the Italian sentences are written; a missing entry stays English.
 */

type DemoItalian = { hint: string; answer?: string; trap?: string; distractors?: [string, string] };

export const DEMO_IT: Readonly<Record<string, DemoItalian>> = {};
