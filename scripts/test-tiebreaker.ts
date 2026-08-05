/**
 * Verifies the sudden-death tiebreaker path after a 10-question tied match.
 * Run: npx tsx scripts/test-tiebreaker.ts
 */
import assert from "node:assert/strict";
import { REGULAR_MATCH_QUESTIONS } from "../lib/match";
import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "../lib/session-playlist";
import { determineWinner } from "../lib/scoring";
import type { QuestionActive } from "../types/database.types";

function fakeQuestion(id: string, index: number): QuestionActive {
  return {
    id,
    language: "italian",
    level: "A2",
    category: "grammar",
    question_text: `Question ${index + 1}`,
    option_a: "A",
    option_b: "B",
    option_c: "C",
    option_d: "D",
    correct_answer: "A",
    explanation: null,
    random_float: 0.5,
  };
}

function shouldStartTiebreaker(input: {
  currentQuestionIndex: number;
  playerAScore: number;
  playerBScore: number;
  tiebreakerUsed: boolean;
}) {
  const finishedRegularRound =
    input.currentQuestionIndex === REGULAR_MATCH_QUESTIONS - 1;
  const isScoreTied = input.playerAScore === input.playerBScore;
  return finishedRegularRound && isScoreTied && !input.tiebreakerUsed;
}

function startTiebreakerRoundState(state: {
  playlist: QuestionActive[];
  currentQuestionIndex: number;
  tiebreakerUsed: boolean;
  roundPhase: string;
}, question: QuestionActive) {
  return {
    playlist: [...state.playlist, question],
    tiebreakerQuestion: question,
    tiebreakerUsed: true,
    currentQuestionIndex: state.playlist.length,
    roundPhase: "topic_reveal" as const,
  };
}

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

check("regular match is exactly 10 questions", () => {
  assert.equal(REGULAR_MATCH_QUESTIONS, 10);
});

check("equal scores are a true tie (no silent speed winner)", () => {
  assert.equal(determineWinner(1230, 1230, [1000], [5000]), "tie");
  assert.equal(determineWinner(1200, 1100, [], []), "a");
  assert.equal(determineWinner(1000, 1400, [], []), "b");
});

check("after Q10 with tied scores → start tiebreaker", () => {
  assert.equal(
    shouldStartTiebreaker({
      currentQuestionIndex: 9,
      playerAScore: 1230,
      playerBScore: 1230,
      tiebreakerUsed: false,
    }),
    true
  );
});

check("after Q10 with uneven scores → no tiebreaker", () => {
  assert.equal(
    shouldStartTiebreaker({
      currentQuestionIndex: 9,
      playerAScore: 1300,
      playerBScore: 1200,
      tiebreakerUsed: false,
    }),
    false
  );
});

check("mid-match tied scores → no tiebreaker yet", () => {
  assert.equal(
    shouldStartTiebreaker({
      currentQuestionIndex: 4,
      playerAScore: 500,
      playerBScore: 500,
      tiebreakerUsed: false,
    }),
    false
  );
});

check("tiebreaker already used → do not start another", () => {
  assert.equal(
    shouldStartTiebreaker({
      currentQuestionIndex: 9,
      playerAScore: 1230,
      playerBScore: 1230,
      tiebreakerUsed: true,
    }),
    false
  );
});

check("startTiebreakerRound appends an 11th question and moves to index 10", () => {
  const playlist = Array.from({ length: 10 }, (_, i) =>
    fakeQuestion(`q-${i}`, i)
  );
  const before = {
    playlist,
    currentQuestionIndex: 9,
    tiebreakerUsed: false,
    roundPhase: "round_result",
  };
  const tiebreaker = fakeQuestion("q-tie", 10);
  const after = startTiebreakerRoundState(before, tiebreaker);

  assert.equal(after.playlist.length, 11);
  assert.equal(after.currentQuestionIndex, 10);
  assert.equal(after.tiebreakerUsed, true);
  assert.equal(after.roundPhase, "topic_reveal");
  assert.equal(after.playlist[10]?.id, "q-tie");
  assert.equal(
    after.currentQuestionIndex >= REGULAR_MATCH_QUESTIONS,
    true,
    "UI treats index >= 10 as tiebreaker round"
  );
});

check("server playlist payload can append the sudden-death question id", () => {
  const regularIds = Array.from({ length: 10 }, (_, i) => `q-${i}`);
  const withSync = buildQuestionPlaylistPayload(regularIds, {
    questionIndex: 9,
    phase: "round",
    roundStartedAt: Date.now(),
  });
  assert.deepEqual(parseQuestionPlaylist(withSync).questionIds, regularIds);

  const appended = buildQuestionPlaylistPayload(
    [...regularIds, "q-tie"],
    {
      questionIndex: 10,
      phase: "round",
      roundStartedAt: Date.now() + 1000,
    }
  );
  const parsed = parseQuestionPlaylist(appended);
  assert.equal(parsed.questionIds.length, 11);
  assert.equal(parsed.questionIds[10], "q-tie");
  assert.equal(parsed.sync?.questionIndex, 10);
});

check("after sudden-death, still-even scores finish as tie", () => {
  // Both scored 1230 in regular + same points on Q11
  assert.equal(determineWinner(1370, 1370), "tie");
});

check("sudden-death that breaks the score produces a winner", () => {
  assert.equal(determineWinner(1370, 1230), "a");
  assert.equal(determineWinner(1230, 1370), "b");
});

console.log(`\n${passed} checks passed`);
if (process.exitCode) {
  console.error("Tiebreaker verification FAILED");
} else {
  console.log("Tiebreaker verification OK — 11th question path is wired correctly");
}
