/**
 * Verifies refresh/resume decisions for PvP matches.
 * Run: npx tsx scripts/test-match-resume.ts
 */
import assert from "node:assert/strict";
import {
  buildMatchScoreState,
  localResolvedThroughIndex,
  shouldResumeRoundResult,
  type MatchRoundReview,
} from "../lib/match-score-state";

function review(questionIndex: number): MatchRoundReview {
  return {
    questionIndex,
    isTiebreaker: false,
    questionId: `q-${questionIndex}`,
    category: "grammar",
    questionText: `Q${questionIndex}`,
    correctAnswer: "A",
    correctOptionText: "A",
    selectedAnswer: "A",
    selectedOptionText: "A",
    wasCorrect: true,
    pointsEarned: 100,
  };
}

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("fresh match has nothing resolved", () => {
  assert.equal(localResolvedThroughIndex([]), -1);
  assert.equal(shouldResumeRoundResult(0, -1), false);
});

check("refresh during unanswered round resumes playing (not result)", () => {
  // Scores through Q2; sync still on Q3 (current unanswered question).
  assert.equal(shouldResumeRoundResult(3, 2), false);
});

check("refresh during result screen resumes result (does not replay)", () => {
  // Round Q5 was scored; sync cursor has not advanced yet.
  assert.equal(shouldResumeRoundResult(5, 5), true);
});

check("refresh after host already advanced joins the next round", () => {
  // Local scores through Q5; host published Q6 while we were gone.
  assert.equal(shouldResumeRoundResult(6, 5), false);
});

check("buildMatchScoreState tracks highest scored index", () => {
  const score = buildMatchScoreState({
    currentQuestionIndex: 4,
    playerAScore: 200,
    playerBScore: 100,
    playerAResponseTimes: [1000, 1200],
    playerBResponseTimes: [900],
    lastRoundPointsA: 100,
    lastRoundPointsB: 0,
    categoryProgress: {
      grammar: { correct: 2, total: 2 },
      vocabulary: { correct: 0, total: 0 },
      "fill-in-the-blank": { correct: 0, total: 0 },
      idioms: { correct: 0, total: 0 },
    },
    roundReviews: [review(0), review(1), review(3)],
    tiebreakerUsed: false,
    roundPhase: "round_result",
    matchWinner: null,
  });
  assert.equal(score.resolvedThroughIndex, 3);
  assert.equal(shouldResumeRoundResult(3, score.resolvedThroughIndex), true);
  assert.equal(shouldResumeRoundResult(4, score.resolvedThroughIndex), false);
});

check("stale sync behind scores must never reopen an old question", () => {
  // Defensive: if a stale poll briefly showed an older index, stay on result.
  assert.equal(shouldResumeRoundResult(2, 5), true);
});

console.log(`\n${passed} checks passed`);
console.log("Match refresh/resume verification OK");
