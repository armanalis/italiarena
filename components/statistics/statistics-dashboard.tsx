"use client";

import { useEffect, useState } from "react";
import { BookOpen, ClipboardList, Target, TrendingUp } from "lucide-react";
import type { UserMistakeWithQuestion } from "@/app/dashboard/statistics/actions";
import { MistakePracticeSession } from "@/components/statistics/mistake-practice-session";
import { MistakesListDialog } from "@/components/statistics/mistakes-list-dialog";
import { ResetStatsButton } from "@/components/statistics/reset-stats-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCategoryLabel } from "@/lib/scoring";
import type { PlayerStats, QuestionCategory } from "@/types/database.types";

type StatisticsDashboardProps = {
  stats: PlayerStats | null;
  mistakes: UserMistakeWithQuestion[];
};

function pct(correct: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${Math.round((correct / total) * 100)}%`;
}

function overallAccuracy(stats: PlayerStats) {
  const correct =
    stats.grammar_correct +
    stats.vocab_correct +
    stats.fill_blank_correct +
    stats.idioms_correct;
  const total =
    stats.grammar_total +
    stats.vocab_total +
    stats.fill_blank_total +
    stats.idioms_total;

  return pct(correct, total);
}

const CATEGORY_KEYS: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

export function StatisticsDashboard({
  stats,
  mistakes: initialMistakes,
}: StatisticsDashboardProps) {
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [showMistakes, setShowMistakes] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    setMistakes(initialMistakes);
  }, [initialMistakes]);

  const categories = stats
    ? [
        {
          key: "grammar" as const,
          label: formatCategoryLabel("grammar"),
          correct: stats.grammar_correct,
          total: stats.grammar_total,
        },
        {
          key: "vocabulary" as const,
          label: formatCategoryLabel("vocabulary"),
          correct: stats.vocab_correct,
          total: stats.vocab_total,
        },
        {
          key: "fill-in-the-blank" as const,
          label: formatCategoryLabel("fill-in-the-blank"),
          correct: stats.fill_blank_correct,
          total: stats.fill_blank_total,
        },
        {
          key: "idioms" as const,
          label: formatCategoryLabel("idioms"),
          correct: stats.idioms_correct,
          total: stats.idioms_total,
        },
      ]
    : [];

  const mistakesByCategory = CATEGORY_KEYS.map((category) => ({
    category,
    label: formatCategoryLabel(category),
    count: mistakes.filter((mistake) => mistake.question.category === category)
      .length,
  }));

  const hasStats = Boolean(stats?.matches_played);
  const hasMistakes = mistakes.length > 0;

  if (practiceMode) {
    return (
      <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-4 sm:p-8 lg:px-10 xl:px-12">
        <MistakePracticeSession
          initialMistakes={mistakes}
          onMistakesChange={setMistakes}
          onClose={() => {
            setPracticeMode(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-4 sm:p-8 lg:px-10 xl:px-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track match performance and review questions you still need to learn.
          </p>
        </div>
        <ResetStatsButton hasStats={hasStats} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Win / Loss
            </CardDescription>
            <CardTitle className="text-3xl">
              {stats ? `${stats.matches_won} / ${stats.matches_lost}` : "— / —"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.matches_played
                ? `${stats.matches_played} match${stats.matches_played === 1 ? "" : "es"} played`
                : "Complete a match to start tracking wins and losses."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="size-4" />
              Overall accuracy
            </CardDescription>
            <CardTitle className="text-3xl">
              {stats ? overallAccuracy(stats) : "—%"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Based on live matches only — practice tests do not change this.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Mistakes to review
            </CardDescription>
            <CardTitle className="text-3xl">{mistakes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasMistakes
                ? "Wrong answers saved from your recent matches."
                : "Play a match — wrong answers will show up here."}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Accuracy by category</CardTitle>
          <CardDescription>
            Match accuracy for each question type.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category.key}
              className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
            >
              <p className="text-sm font-medium">{category.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {pct(category.correct, category.total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {category.total > 0
                  ? `${category.correct} correct out of ${category.total}`
                  : "No answers recorded yet"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-indigo-500/20 bg-card/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-indigo-400" />
                Learn from your mistakes
              </CardTitle>
              <CardDescription className="mt-1.5">
                Review what you got wrong and practice until each question is
                answered correctly 3 times in a row. Mastered questions leave
                this list, but your match percentages stay the same.
              </CardDescription>
            </div>
            {hasMistakes && (
              <Badge variant="secondary" className="tabular-nums">
                {mistakes.length} active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {mistakesByCategory.map(({ category, label, count }) => (
              <div
                key={category}
                className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
              >
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-muted-foreground">
                  {count} mistake{count === 1 ? "" : "s"} to practice
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setShowMistakes(true)}
            >
              See my mistakes
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={!hasMistakes}
              onClick={() => setPracticeMode(true)}
            >
              Practice mistakes from recent matches
            </Button>
          </div>
        </CardContent>
      </Card>

      <MistakesListDialog
        open={showMistakes}
        onOpenChange={setShowMistakes}
        mistakes={mistakes}
      />
    </main>
  );
}
