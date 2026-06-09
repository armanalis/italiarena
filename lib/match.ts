import type { QuestionActive, QuestionCategory } from "@/types/database.types";

export const REGULAR_MATCH_QUESTIONS = 10;

const QUESTION_CATEGORIES: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

const MATCH_CATEGORY_QUOTA: ReadonlyArray<{
  category: QuestionCategory;
  count: number;
}> = [
  { category: "grammar", count: 3 },
  { category: "vocabulary", count: 3 },
  { category: "fill-in-the-blank", count: 3 },
  { category: "idioms", count: 1 },
];

export function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function normalizeQuestionCategory(value: string): QuestionCategory {
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");

  if (normalized === "fill in the blank") {
    return "fill-in-the-blank";
  }

  if (QUESTION_CATEGORIES.includes(normalized as QuestionCategory)) {
    return normalized as QuestionCategory;
  }

  return "grammar";
}

function pickFromPool(
  pool: QuestionActive[],
  count: number,
  recentIds: ReadonlySet<string>,
  seenIds: ReadonlySet<string>,
  usedIds: ReadonlySet<string>
): QuestionActive[] {
  if (count <= 0 || pool.length === 0) {
    return [];
  }

  const available = pool.filter((question) => !usedIds.has(question.id));
  const buckets = [
    available.filter(
      (question) => !recentIds.has(question.id) && !seenIds.has(question.id)
    ),
    available.filter(
      (question) => !recentIds.has(question.id) && seenIds.has(question.id)
    ),
    available.filter(
      (question) => recentIds.has(question.id) && !seenIds.has(question.id)
    ),
    available.filter(
      (question) => recentIds.has(question.id) && seenIds.has(question.id)
    ),
  ];

  const picks: QuestionActive[] = [];

  for (const bucket of buckets) {
    if (picks.length >= count) {
      break;
    }

    for (const question of shuffleArray(bucket)) {
      if (picks.length >= count) {
        break;
      }

      if (!picks.some((pick) => pick.id === question.id)) {
        picks.push(question);
      }
    }
  }

  return picks;
}

export function buildMatchPlaylist(
  pool: QuestionActive[],
  recentIds: ReadonlySet<string>,
  seenIds: ReadonlySet<string>
): QuestionActive[] {
  const selected: QuestionActive[] = [];
  const usedIds = new Set<string>();

  for (const { category, count } of MATCH_CATEGORY_QUOTA) {
    const categoryPool = pool.filter(
      (question) => normalizeQuestionCategory(question.category) === category
    );
    const picks = pickFromPool(categoryPool, count, recentIds, seenIds, usedIds);

    for (const question of picks) {
      selected.push(question);
      usedIds.add(question.id);
    }
  }

  const remaining = REGULAR_MATCH_QUESTIONS - selected.length;
  if (remaining > 0) {
    const fillerPool = pool.filter((question) => !usedIds.has(question.id));
    const filler = pickFromPool(
      fillerPool,
      remaining,
      recentIds,
      seenIds,
      usedIds
    );

    for (const question of filler) {
      selected.push(question);
      usedIds.add(question.id);
    }
  }

  return shuffleArray(selected);
}

export function splitSessionQuestions<T extends { id: string }>(questions: T[]) {
  return {
    regular: questions.slice(0, REGULAR_MATCH_QUESTIONS),
  };
}
