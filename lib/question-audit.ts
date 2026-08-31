import {
  GROQ_EXPLANATION_MODEL,
  GROQ_REASONING_EFFORT,
} from "@/lib/ai-explanations";
import {
  CATEGORY_GUIDANCE,
  LEVEL_GUIDANCE,
} from "@/lib/question-contribution";
import type { ProficiencyLevel } from "@/lib/constants";
import { normalizeQuestionCategory } from "@/lib/match";
import type {
  CorrectAnswer,
  QuestionActive,
  QuestionCategory,
  QuestionLevel,
} from "@/types/database.types";

export type AuditVerdict = "pass" | "review" | "fail";

export type MechanicalFlag =
  | "empty_field"
  | "duplicate_options"
  | "invalid_correct_answer"
  | "missing_blank"
  | "identical_to_prompt";

export type AiIssueKind =
  | "typo"
  | "wrong_answer"
  | "unnatural_phrasing"
  | "duplicate_answer"
  | "ambiguous"
  | "level_mismatch"
  | "category_mismatch"
  | "other";

export type QuestionAuditAiResult = {
  verdict: AuditVerdict;
  confidence: "high" | "medium" | "low";
  issues: AiIssueKind[];
  summary: string;
  suggested_correct_answer: CorrectAnswer | null;
  suggested_fix: {
    question_text?: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_answer?: CorrectAnswer;
  } | null;
};

export type QuestionAuditResult = {
  id: string;
  level: QuestionLevel;
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
  mechanical_flags: MechanicalFlag[];
  ai: QuestionAuditAiResult | null;
  ai_error: string | null;
  final_verdict: AuditVerdict;
};

const CORRECT_ANSWERS: CorrectAnswer[] = ["A", "B", "C", "D"];
const AI_ISSUE_KINDS: AiIssueKind[] = [
  "typo",
  "wrong_answer",
  "unnatural_phrasing",
  "duplicate_answer",
  "ambiguous",
  "level_mismatch",
  "category_mismatch",
  "other",
];

function normalizeOption(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function runMechanicalQuestionChecks(
  question: Pick<
    QuestionActive,
    | "question_text"
    | "option_a"
    | "option_b"
    | "option_c"
    | "option_d"
    | "correct_answer"
    | "category"
  >
): MechanicalFlag[] {
  const flags: MechanicalFlag[] = [];
  const fields = [
    question.question_text,
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ];

  if (fields.some((field) => !field?.trim())) {
    flags.push("empty_field");
  }

  if (!CORRECT_ANSWERS.includes(question.correct_answer)) {
    flags.push("invalid_correct_answer");
  }

  const options = [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ].map(normalizeOption);

  if (new Set(options.filter(Boolean)).size < options.filter(Boolean).length) {
    flags.push("duplicate_options");
  }

  const category = normalizeQuestionCategory(question.category);
  if (category === "fill-in-the-blank") {
    const hasBlank = /_{2,}|\(\s*\)|\.\.\.|…|\[.?\]/.test(
      question.question_text
    );
    if (!hasBlank) {
      flags.push("missing_blank");
    }
  }

  const promptNorm = normalizeOption(question.question_text);
  if (options.some((option) => option && option === promptNorm)) {
    flags.push("identical_to_prompt");
  }

  return flags;
}

function buildAuditPrompt(question: QuestionActive): string {
  const level = question.level as ProficiencyLevel;
  const category = normalizeQuestionCategory(
    question.category
  ) as QuestionCategory;
  const levelGuide = LEVEL_GUIDANCE[level];
  const categoryGuide = CATEGORY_GUIDANCE[category];

  return [
    "You are a strict Italian CEFR multiple-choice quiz auditor.",
    "Check whether this live quiz question is correct enough for public users.",
    "Be conservative: if the marked correct answer is wrong, or two options are both correct / identical, verdict must be fail.",
    "",
    "Return ONLY valid JSON with this exact shape:",
    "{",
    '  "verdict": "pass" | "review" | "fail",',
    '  "confidence": "high" | "medium" | "low",',
    '  "issues": ["typo" | "wrong_answer" | "unnatural_phrasing" | "duplicate_answer" | "ambiguous" | "level_mismatch" | "category_mismatch" | "other"],',
    '  "summary": "1-2 sentences",',
    '  "suggested_correct_answer": "A" | "B" | "C" | "D" | null,',
    '  "suggested_fix": null | {',
    '    "question_text"?: string,',
    '    "option_a"?: string,',
    '    "option_b"?: string,',
    '    "option_c"?: string,',
    '    "option_d"?: string,',
    '    "correct_answer"?: "A" | "B" | "C" | "D"',
    "  }",
    "}",
    "",
    "Rules:",
    "- pass: one clear correct answer, Italian looks natural, level/category fit.",
    "- review: minor typo/style issue, weak distractors, or borderline level.",
    "- fail: wrong marked answer, duplicate/identical options, multiple valid answers, broken Italian, or clear level/category mismatch.",
    "- suggested_fix: only include fields that should change. Prefer minimal edits.",
    "- suggested_correct_answer: set when the marked letter is wrong.",
    "",
    `Level: ${question.level}`,
    levelGuide
      ? `Level guide: ${levelGuide.summary}. Too hard: ${levelGuide.too_hard.join("; ")}`
      : "",
    `Category: ${category}`,
    categoryGuide
      ? `Category must: ${categoryGuide.must.join("; ")}. Avoid: ${categoryGuide.avoid.join("; ")}`
      : "",
    "",
    `Question: ${question.question_text}`,
    `A: ${question.option_a}`,
    `B: ${question.option_b}`,
    `C: ${question.option_c}`,
    `D: ${question.option_d}`,
    `Marked correct: ${question.correct_answer}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseAiAuditJson(raw: string): QuestionAuditAiResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<QuestionAuditAiResult>;
    const verdict = parsed.verdict;
    const confidence = parsed.confidence;

    if (verdict !== "pass" && verdict !== "review" && verdict !== "fail") {
      return null;
    }

    if (
      confidence !== "high" &&
      confidence !== "medium" &&
      confidence !== "low"
    ) {
      return null;
    }

    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) {
      return null;
    }

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues
          .filter((issue): issue is AiIssueKind =>
            AI_ISSUE_KINDS.includes(issue as AiIssueKind)
          )
          .slice(0, 8)
      : [];

    let suggested_correct_answer: CorrectAnswer | null = null;
    if (
      typeof parsed.suggested_correct_answer === "string" &&
      CORRECT_ANSWERS.includes(parsed.suggested_correct_answer as CorrectAnswer)
    ) {
      suggested_correct_answer =
        parsed.suggested_correct_answer as CorrectAnswer;
    }

    let suggested_fix: QuestionAuditAiResult["suggested_fix"] = null;
    if (parsed.suggested_fix && typeof parsed.suggested_fix === "object") {
      const fix = parsed.suggested_fix;
      const next: NonNullable<QuestionAuditAiResult["suggested_fix"]> = {};
      for (const key of [
        "question_text",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
      ] as const) {
        if (typeof fix[key] === "string" && fix[key].trim()) {
          next[key] = fix[key].trim();
        }
      }
      if (
        typeof fix.correct_answer === "string" &&
        CORRECT_ANSWERS.includes(fix.correct_answer as CorrectAnswer)
      ) {
        next.correct_answer = fix.correct_answer as CorrectAnswer;
      }
      if (Object.keys(next).length > 0) {
        suggested_fix = next;
      }
    }

    return {
      verdict,
      confidence,
      issues,
      summary: summary.slice(0, 600),
      suggested_correct_answer,
      suggested_fix,
    };
  } catch {
    return null;
  }
}

export async function auditQuestionWithAi(
  question: QuestionActive,
  options?: { apiKey?: string; model?: string }
): Promise<
  | { status: "ready"; result: QuestionAuditAiResult }
  | { status: "unavailable"; reason: string }
> {
  const apiKey = options?.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { status: "unavailable", reason: "GROQ_API_KEY is not configured." };
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model ?? GROQ_EXPLANATION_MODEL,
        reasoning_effort: GROQ_REASONING_EFFORT,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You audit Italian quiz questions for correctness before public release. Output JSON only.",
          },
          {
            role: "user",
            content: buildAuditPrompt(question),
          },
        ],
        temperature: 0.1,
        max_tokens: 1400,
      }),
    }
  );

  if (!response.ok) {
    console.error(
      `[groq] audit request failed (${response.status}): ${await response
        .text()
        .catch(() => "<unreadable body>")}`
    );

    return {
      status: "unavailable",
      reason:
        response.status === 429
          ? "AI rate limit reached."
          : `AI audit request failed (${response.status}).`,
    };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { status: "unavailable", reason: "AI returned an empty response." };
  }

  const result = parseAiAuditJson(content);
  if (!result) {
    return { status: "unavailable", reason: "AI response could not be parsed." };
  }

  return { status: "ready", result };
}

export function combineAuditVerdict(
  mechanicalFlags: MechanicalFlag[],
  ai: QuestionAuditAiResult | null
): AuditVerdict {
  if (
    mechanicalFlags.includes("duplicate_options") ||
    mechanicalFlags.includes("empty_field") ||
    mechanicalFlags.includes("invalid_correct_answer")
  ) {
    return "fail";
  }

  if (!ai) {
    return mechanicalFlags.length > 0 ? "review" : "pass";
  }

  if (ai.verdict === "fail") {
    return "fail";
  }

  if (ai.verdict === "review" || mechanicalFlags.length > 0) {
    return "review";
  }

  return "pass";
}

export async function auditQuestion(
  question: QuestionActive,
  options?: { skipAi?: boolean; apiKey?: string; model?: string }
): Promise<QuestionAuditResult> {
  const mechanical_flags = runMechanicalQuestionChecks(question);
  let ai: QuestionAuditAiResult | null = null;
  let ai_error: string | null = null;

  if (!options?.skipAi) {
    const aiResult = await auditQuestionWithAi(question, options);
    if (aiResult.status === "ready") {
      ai = aiResult.result;
    } else {
      ai_error = aiResult.reason;
    }
  }

  return {
    id: question.id,
    level: question.level,
    category: question.category,
    question_text: question.question_text,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
    correct_answer: question.correct_answer,
    mechanical_flags,
    ai,
    ai_error,
    final_verdict: combineAuditVerdict(mechanical_flags, ai),
  };
}
