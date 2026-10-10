import {
  GROQ_EXPLANATION_MODEL,
  GROQ_REASONING_EFFORT,
} from "@/lib/ai-explanations";
import type { AskAiExplanationPayload } from "@/lib/ai-explanations";

function formatAnswerLine(
  letter: string | null,
  text: string | null,
  fallback: string
): string {
  if (!letter) {
    return fallback;
  }
  return `${letter}. ${text ?? ""}`.trim();
}

export function buildItalianExplanationPrompt(
  payload: AskAiExplanationPayload
): string {
  const studentLine = payload.wasCorrect
    ? `The student answered correctly: ${formatAnswerLine(
        payload.selectedAnswer,
        payload.selectedOptionText,
        "No answer"
      )}.`
    : `The student answered: ${formatAnswerLine(
        payload.selectedAnswer,
        payload.selectedOptionText,
        "No answer / timed out"
      )}.`;

  return [
    "You are an Italian teacher helping international university students in Italy.",
    "Explain in clear, simple English using at most 4 short paragraphs.",
    "Focus on the grammar or vocabulary rule. Be concise and practical.",
    "Do not change the correct answer. Do not add unrelated trivia.",
    "",
    `Category: ${payload.category}`,
    `Question: ${payload.questionText}`,
    `Correct answer: ${formatAnswerLine(
      payload.correctAnswer,
      payload.correctOptionText,
      ""
    )}`,
    studentLine,
    payload.wasCorrect
      ? "Briefly confirm why this answer is correct."
      : "Explain why the correct answer fits and why the student's choice does not.",
  ].join("\n");
}

/** Long enough for the slowest audit; a hung upstream must not hold the request open. */
const GROQ_TIMEOUT_MS = 30_000;

export type GroqChatResult =
  | { ok: true; content: string }
  | { ok: false; reason: "missing_key" | "rate_limited" | "failed" | "empty"; status?: number };

/** One Groq chat completion. Never throws; logs why an upstream call failed. */
export async function groqChat(request: {
  label: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  json?: boolean;
  apiKey?: string;
  model?: string;
}): Promise<GroqChatResult> {
  const apiKey = request.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "missing_key" };
  }

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model ?? GROQ_EXPLANATION_MODEL,
        reasoning_effort: GROQ_REASONING_EFFORT,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(
      `[groq] ${request.label} request failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { ok: false, reason: "failed" };
  }

  if (!response.ok) {
    // Log the upstream body: a decommissioned model returns 404 model_not_found,
    // which is indistinguishable from any other failure once it is flattened.
    console.error(
      `[groq] ${request.label} request failed (${response.status}): ${await response
        .text()
        .catch(() => "<unreadable body>")}`
    );
    return {
      ok: false,
      reason: response.status === 429 ? "rate_limited" : "failed",
      status: response.status,
    };
  }

  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ? { ok: true, content } : { ok: false, reason: "empty" };
}

export async function generateGroqExplanation(
  payload: AskAiExplanationPayload
): Promise<{ explanation: string } | { error: string }> {
  const result = await groqChat({
    label: "explanation",
    system:
      "You explain Italian quiz answers to English-speaking learners. Stay accurate and encouraging.",
    user: buildItalianExplanationPrompt(payload),
    temperature: 0.35,
    maxTokens: 900,
  });

  if (result.ok) {
    return { explanation: result.content };
  }

  switch (result.reason) {
    case "missing_key":
      return { error: "AI explanations are not configured yet." };
    case "rate_limited":
      return { error: "AI is busy right now. Please try again in a minute." };
    case "empty":
      return { error: "AI returned an empty response. Please try again." };
    default:
      return { error: "Could not generate an explanation. Please try again." };
  }
}

/** Admin-facing reason for a failed call (submission pre-check, bulk audit). */
export function unavailableReason(
  result: Extract<GroqChatResult, { ok: false }>,
  failedMessage: string
): string {
  switch (result.reason) {
    case "missing_key":
      return "GROQ_API_KEY is not configured.";
    case "rate_limited":
      return "AI rate limit reached.";
    case "empty":
      return "AI returned an empty response.";
    default:
      return failedMessage;
  }
}
