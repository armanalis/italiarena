/** Personal match statistics — wins, losses, and accuracy by category. */
import { getPlayerStatistics } from "@/app/dashboard/settings/actions";
import { ResetStatsButton } from "@/components/statistics/reset-stats-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardingComplete } from "@/lib/auth";
import { formatCategoryLabel } from "@/lib/scoring";
import { Target, TrendingUp } from "lucide-react";

function pct(correct: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${Math.round((correct / total) * 100)}%`;
}

function overallAccuracy(stats: {
  grammar_correct: number;
  grammar_total: number;
  vocab_correct: number;
  vocab_total: number;
  fill_blank_correct: number;
  fill_blank_total: number;
  idioms_correct: number;
  idioms_total: number;
}) {
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

export default async function StatisticsPage() {
  await requireOnboardingComplete();
  const stats = await getPlayerStatistics();

  const categories = stats
    ? [
        {
          key: "grammar",
          label: formatCategoryLabel("grammar"),
          correct: stats.grammar_correct,
          total: stats.grammar_total,
        },
        {
          key: "vocabulary",
          label: formatCategoryLabel("vocabulary"),
          correct: stats.vocab_correct,
          total: stats.vocab_total,
        },
        {
          key: "fill-in-the-blank",
          label: formatCategoryLabel("fill-in-the-blank"),
          correct: stats.fill_blank_correct,
          total: stats.fill_blank_total,
        },
        {
          key: "idioms",
          label: formatCategoryLabel("idioms"),
          correct: stats.idioms_correct,
          total: stats.idioms_total,
        },
      ]
    : [];

  const hasStats = Boolean(stats?.matches_played);

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your performance across all completed matches.
          </p>
        </div>
        <ResetStatsButton hasStats={hasStats} />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
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
              Combined accuracy across grammar, vocabulary, fill-in-the-blank, and
              idioms.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Accuracy by category</CardTitle>
          <CardDescription>
            How often you answer correctly in each question type.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
    </main>
  );
}
