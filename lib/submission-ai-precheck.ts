import { GROQ_EXPLANATION_MODEL } from "@/lib/ai-explanations";
import {
  CATEGORY_GUIDANCE,
  LEVEL_GUIDANCE,
  type QuestionSubmissionPayload,
} from "@/lib/question-contribution";
import { formatCategoryLabel } from "@/lib/scoring";
import type { ProficiencyLevel } from "@/lib/constants";

export type SubmissionAiRecommendation =
  | "approve"
  | "review_carefully"
  | "likely_reject";

export type SubmissionAiLevelMatch =
  | "match"
  | "too_easy_for_label"
  | "too_hard_for_label"
  | "unclear";

export type SubmissionAiCategoryMatch = "match" | "mismatch" | "unclear";

export type SubmissionAiPrecheck = {
  recommendation: SubmissionAiRecommendation;
  level_match: SubmissionAiLevelMatch;
  category_match: SubmissionAiCategoryMatch;
  suggested_level: ProficiencyLevel | null;
  summary: string;
  flags: string[];
};

export type SubmissionAiPrecheckStatus = "pending" | "ready" | "unavailable";

const VALID_LEVELS: ProficiencyLevel[] = [
  "A1",
  "A1-A2",
  "A2",
  "A2-B1",
  "B1",
  "B2",
  "C1",
];

function buildPrecheckPrompt(payload: QuestionSubmissionPayload): string {
  const levelGuide = LEVEL_GUIDANCE[payload.level];
  const categoryGuide = CATEGORY_GUIDANCE[payload.category];

  return [
    "You are a strict Italian CEFR quiz reviewer for a language-learning app.",
    "Review a contributor submission. Be conservative: flag level/category mismatches.",
    "This is advisory only — a human admin makes the final decision.",
    "",
    "Return ONLY valid JSON with this exact shape:",
    "{",
    '  "recommendation": "approve" | "review_carefully" | "likely_reject",',
    '  "level_match": "match" | "too_easy_for_label" | "too_hard_for_label" | "unclear",',
    '  "category_match": "match" | "mismatch" | "unclear",',
    '  "suggested_level": "A1" | "A1-A2" | "A2" | "A2-B1" | "B1" | "B2" | "C1" | null,',
    '  "summary": "1-2 sentences for the admin reviewer",',
    '  "flags": ["short issue strings"]',
    "}",
    "",
    "Rules:",
    "- likely_reject: clear wrong level (e.g. basic A1 vocab labeled B2) or wrong category.",
    "- review_carefully: plausible but ambiguous, weak distractors, or borderline level.",
    "- approve: level and category fit well; one clear correct answer.",
    "- suggested_level: only when level_match is not match.",
    "",
    `Submitted level: ${payload.level}`,
    `Level guide: ${levelGuide.summary}`,
    `Too hard for level: ${levelGuide.too_hard.join("; ")}`,
    "",
    `Submitted category: ${payload.category}`,
    `Category must: ${categoryGuide.must.join("; ")}`,
    `Category avoid: ${categoryGuide.avoid.join("; ")}`,
    "",
    `Question: ${payload.question_text}`,
    `A: ${payload.option_a}`,
    `B: ${payload.option_b}`,
    `C: ${payload.option_c}`,
    `D: ${payload.option_d}`,
    `Correct: ${payload.correct_answer}`,
    `Contributor rationale: ${payload.rationale}`,
  ].join("\n");
}

function parsePrecheckJson(raw: string): SubmissionAiPrecheck | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SubmissionAiPrecheck>;

    const recommendation = parsed.recommendation;
    const level_match = parsed.level_match;
    const category_match = parsed.category_match;

    if (
      recommendation !== "approve" &&
      recommendation !== "review_carefully" &&
      recommendation !== "likely_reject"
    ) {
      return null;
    }

    if (
      level_match !== "match" &&
      level_match !== "too_easy_for_label" &&
      level_match !== "too_hard_for_label" &&
      level_match !== "unclear"
    ) {
      return null;
    }

    if (
      category_match !== "match" &&
      category_match !== "mismatch" &&
      category_match !== "unclear"
    ) {
      return null;
    }

    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) {
      return null;
    }

    const flags = Array.isArray(parsed.flags)
      ? parsed.flags
          .filter((flag): flag is string => typeof flag === "string")
          .map((flag) => flag.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    let suggested_level: ProficiencyLevel | null = null;
    if (
      typeof parsed.suggested_level === "string" &&
      VALID_LEVELS.includes(parsed.suggested_level as ProficiencyLevel)
    ) {
      suggested_level = parsed.suggested_level as ProficiencyLevel;
    }

    return {
      recommendation,
      level_match,
      category_match,
      suggested_level,
      summary: summary.slice(0, 600),
      flags,
    };
  } catch {
    return null;
  }
}

export async function generateSubmissionAiPrecheck(
  payload: QuestionSubmissionPayload
): Promise<
  | { status: "ready"; precheck: SubmissionAiPrecheck }
  | { status: "unavailable"; reason: string }
> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { status: "unavailable", reason: "GROQ_API_KEY is not configured." };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_EXPLANATION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You review Italian quiz questions for CEFR level and category accuracy. Output JSON only.",
        },
        {
          role: "user",
          content: buildPrecheckPrompt(payload),
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    return {
      status: "unavailable",
      reason:
        response.status === 429
          ? "AI rate limit reached."
          : "AI pre-check request failed.",
    };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { status: "unavailable", reason: "AI returned an empty response." };
  }

  const precheck = parsePrecheckJson(content);
  if (!precheck) {
    return { status: "unavailable", reason: "AI response could not be parsed." };
  }

  return { status: "ready", precheck };
}

export function formatAiRecommendationLabel(
  recommendation: SubmissionAiRecommendation
): string {
  switch (recommendation) {
    case "approve":
      return "AI: Looks good";
    case "review_carefully":
      return "AI: Review carefully";
    case "likely_reject":
      return "AI: Likely mismatch";
  }
}

export function formatAiLevelMatchLabel(
  levelMatch: SubmissionAiLevelMatch,
  submittedLevel: string,
  suggestedLevel: string | null
): string {
  switch (levelMatch) {
    case "match":
      return `Level fits ${submittedLevel}`;
    case "too_easy_for_label":
      return suggestedLevel
        ? `May be too easy for ${submittedLevel} — consider ${suggestedLevel}`
        : `May be too easy for ${submittedLevel}`;
    case "too_hard_for_label":
      return suggestedLevel
        ? `May be too hard for ${submittedLevel} — consider ${suggestedLevel}`
        : `May be too hard for ${submittedLevel}`;
    case "unclear":
      return "Level fit is unclear";
  }
}

export function formatAiCategoryMatchLabel(
  categoryMatch: SubmissionAiCategoryMatch,
  category: string
): string {
  switch (categoryMatch) {
    case "match":
      return `Category fits ${formatCategoryLabel(category)}`;
    case "mismatch":
      return `May not be a true ${formatCategoryLabel(category)} question`;
    case "unclear":
      return "Category fit is unclear";
  }
}
