import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGE,
  type ProficiencyLevel,
} from "@/lib/constants";
import type { CorrectAnswer, QuestionCategory } from "@/types/database.types";

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

export const MAX_PENDING_SUBMISSIONS = 5;
export const MAX_SUBMISSIONS_PER_DAY = 10;

export type QuestionSubmissionInput = {
  level: ProficiencyLevel;
  category: QuestionCategory;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
  rationale: string;
  level_confirmed: boolean;
  category_confirmed: boolean;
};

export type QuestionSubmissionPayload = Omit<
  QuestionSubmissionInput,
  "level_confirmed" | "category_confirmed"
> & {
  language: typeof TARGET_LANGUAGE;
};

export const CATEGORY_GUIDANCE: Record<
  QuestionCategory,
  { title: string; must: string[]; avoid: string[] }
> = {
  grammar: {
    title: "Grammar",
    must: [
      "Test one clear grammar point (tense, agreement, pronoun, preposition, etc.).",
      "Wrong options should be plausible grammar mistakes, not random words.",
    ],
    avoid: [
      "Pure vocabulary questions disguised as grammar.",
      "Ambiguous sentences where more than one answer could be defended.",
    ],
  },
  vocabulary: {
    title: "Vocabulary",
    must: [
      "Ask for the meaning or best translation of a word/phrase in context.",
      "Use a short sentence or phrase so context matters.",
    ],
    avoid: [
      "Obscure words far above the selected CEFR level.",
      "Trick questions with multiple valid synonyms.",
    ],
  },
  "fill-in-the-blank": {
    title: "Fill in the blank",
    must: [
      'Include a blank marker in the question (e.g. "___", "…", or "( )").',
      "Only one option should fit naturally in the blank.",
    ],
    avoid: [
      "Blanks where several answers are equally correct.",
      "Questions without a visible blank marker.",
    ],
  },
  idioms: {
    title: "Idioms",
    must: [
      "Focus on a common Italian idiom, expression, or fixed phrase.",
      "Wrong answers should misunderstand the idiom literally or confuse similar expressions.",
    ],
    avoid: [
      "Single-word vocabulary questions.",
      "Extremely regional slang unless level is C1 and noted in the rationale.",
    ],
  },
};

export const LEVEL_GUIDANCE: Record<
  ProficiencyLevel,
  { summary: string; suitable: string[]; too_hard: string[] }
> = {
  A1: {
    summary: "Beginner — present tense, basic nouns, everyday survival phrases.",
    suitable: [
      "ciao, essere/avere, numbers, family, food, simple present tense",
    ],
    too_hard: [
      "subjunctive, complex clauses, abstract topics, literary vocabulary",
    ],
  },
  "A1-A2": {
    summary: "High beginner — simple past introduction, slightly longer sentences.",
    suitable: [
      "routine actions, passato prossimo with common verbs, basic questions",
    ],
    too_hard: ["conditionals, passive voice, formal register, idioms"],
  },
  A2: {
    summary: "Elementary — past tenses, future plans, familiar topics.",
    suitable: [
      "passato prossimo vs imperfetto basics, shopping, travel, daily routine",
    ],
    too_hard: ["nuanced subjunctive, advanced idioms, specialized jargon"],
  },
  "A2-B1": {
    summary: "Bridge to intermediate — longer sentences, opinion with simple support.",
    suitable: [
      "comparisons, common connectors (perché, quindi), B1-adjacent vocab in clear context",
    ],
    too_hard: ["C1 literary style, rare idioms, legal/medical terminology"],
  },
  B1: {
    summary: "Intermediate — opinions, experiences, less predictable grammar.",
    suitable: [
      "imperfect vs perfect contrast, ci/ne, pronouns, intermediate connectors",
    ],
    too_hard: ["dense subjunctive chains, highly formal or archaic Italian"],
  },
  B2: {
    summary: "Upper intermediate — nuance, register, and complex structures.",
    suitable: [
      "subjunctive in common triggers, passive, relative clauses, less common idioms",
    ],
    too_hard: [
      "A1-level greetings or single-word meaning unless testing a subtle B2 point",
    ],
  },
  C1: {
    summary: "Advanced — precision, register, idiomatic and abstract language.",
    suitable: [
      "subtle connotations, formal/informal register, advanced collocations",
    ],
    too_hard: ["trivial A2 vocabulary with no advanced angle"],
  },
};

const BLANK_PATTERN = /_{2,}|\.{3}|…|\(\s*\)|\[blank\]/i;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string): string {
  return normalizeText(value).toLowerCase();
}

export function validateQuestionSubmission(
  input: QuestionSubmissionInput
): { ok: true; data: QuestionSubmissionPayload } | { ok: false; error: string } {
  if (!input.level_confirmed) {
    return {
      ok: false,
      error: "Confirm that the CEFR level matches the difficulty of this question.",
    };
  }

  if (!input.category_confirmed) {
    return {
      ok: false,
      error: "Confirm that the category matches what the question is actually testing.",
    };
  }

  if (!PROFICIENCY_LEVELS.includes(input.level)) {
    return { ok: false, error: "Select a valid CEFR level." };
  }

  if (!QUESTION_CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Select a valid category." };
  }

  const question_text = normalizeText(input.question_text);
  const option_a = normalizeText(input.option_a);
  const option_b = normalizeText(input.option_b);
  const option_c = normalizeText(input.option_c);
  const option_d = normalizeText(input.option_d);
  const rationale = normalizeText(input.rationale);

  if (question_text.length < 12) {
    return {
      ok: false,
      error: "Question text is too short. Add enough context for players.",
    };
  }

  if (question_text.length > 280) {
    return { ok: false, error: "Question text must be 280 characters or fewer." };
  }

  for (const [label, value] of [
    ["A", option_a],
    ["B", option_b],
    ["C", option_c],
    ["D", option_d],
  ] as const) {
    if (value.length < 1) {
      return { ok: false, error: `Option ${label} cannot be empty.` };
    }
    if (value.length > 120) {
      return { ok: false, error: `Option ${label} must be 120 characters or fewer.` };
    }
  }

  const optionKeys = [
    option_a,
    option_b,
    option_c,
    option_d,
  ].map(normalizeKey);
  if (new Set(optionKeys).size !== 4) {
    return { ok: false, error: "All four options must be different." };
  }

  const correctOption =
    input.correct_answer === "A"
      ? option_a
      : input.correct_answer === "B"
        ? option_b
        : input.correct_answer === "C"
          ? option_c
          : option_d;

  if (!correctOption) {
    return { ok: false, error: "Select the correct answer." };
  }

  if (input.category === "fill-in-the-blank" && !BLANK_PATTERN.test(question_text)) {
    return {
      ok: false,
      error:
        'Fill-in-the-blank questions must include a blank marker (e.g. "___" or "…").',
    };
  }

  if (rationale.length < 20) {
    return {
      ok: false,
      error:
        "Add a short rationale (at least 20 characters) explaining why this level and category fit.",
    };
  }

  if (rationale.length > 500) {
    return { ok: false, error: "Rationale must be 500 characters or fewer." };
  }

  return {
    ok: true,
    data: {
      language: TARGET_LANGUAGE,
      level: input.level,
      category: input.category,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer: input.correct_answer,
      rationale,
    },
  };
}

export function normalizeQuestionTextKey(value: string): string {
  return normalizeKey(value);
}
