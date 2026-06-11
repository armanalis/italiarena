import { GROQ_EXPLANATION_MODEL } from "@/lib/ai-explanations";
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

export async function generateGroqExplanation(
  payload: AskAiExplanationPayload
): Promise<{ explanation: string } | { error: string }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { error: "AI explanations are not configured yet." };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_EXPLANATION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You explain Italian quiz answers to English-speaking learners. Stay accurate and encouraging.",
        },
        {
          role: "user",
          content: buildItalianExplanationPrompt(payload),
        },
      ],
      temperature: 0.35,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return {
        error: "AI is busy right now. Please try again in a minute.",
      };
    }

    return { error: "Could not generate an explanation. Please try again." };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const explanation = data.choices?.[0]?.message?.content?.trim();

  if (!explanation) {
    return { error: "AI returned an empty response. Please try again." };
  }

  return { explanation };
}
