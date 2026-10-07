
/** Player-facing bot tiers. `standard` is kept only for older links — same as medium. */
export type BotDifficulty = "easy" | "medium" | "hard";
export type BotDifficultyParam = BotDifficulty | "standard";

/** Default bot match — medium answers after 10 seconds. */
export const BOT_RESPONSE_TIME_MS = 10_000;

const BOT_RESPONSE_MS: Record<BotDifficulty, number> = {
  easy: 15_000,
  medium: 10_000,
  hard: 5_000,
};

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: "Easy Bot",
  medium: "Medium Bot",
  hard: "Hard Bot",
};

export function normalizeBotDifficulty(
  value: string | null | undefined
): BotDifficulty {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  return "medium";
}

export function isBotDifficultyParam(
  value: string | null | undefined
): value is BotDifficultyParam {
  return (
    value === "standard" ||
    value === "easy" ||
    value === "medium" ||
    value === "hard"
  );
}

export function getBotResponseTimeMs(difficulty: BotDifficulty = "medium"): number {
  return BOT_RESPONSE_MS[difficulty];
}

/** Delay until the bot locks an answer, relative to round start. */
export function getBotResponseDelayMs(
  roundStartedAt: number,
  difficulty: BotDifficulty = "medium",
  pauseMs = 0
): number {
  return Math.max(
    0,
    getBotResponseTimeMs(difficulty) - (Date.now() - roundStartedAt - pauseMs)
  );
}

/** Resolve bot tier from the ghost opponent label stored on the session. */
export function botDifficultyFromDisplayName(
  displayName: string
): BotDifficulty {
  for (const [difficulty, label] of Object.entries(BOT_DIFFICULTY_LABELS)) {
    if (displayName === label) {
      return difficulty as BotDifficulty;
    }
  }
  return "medium";
}

// The bot's pick is decided on the server (reveal_round_answer in
// supabase/answer-secrecy-1-functions-2026-10.sql): the browser never holds a
// question's answer before the player has answered. Accuracy there: hard is
// always right; easy/medium use a per-level base (A1 0.62 … C1 0.74) with a
// −0.12 / +0.08 tier bonus, clamped to [0.45, 0.95].

export function getBotDifficultyDescription(difficulty: BotDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "15s per answer · makes more mistakes";
    case "medium":
      return "10s per answer · smarter than Easy";
    case "hard":
      return "5s per answer · always correct";
  }
}
