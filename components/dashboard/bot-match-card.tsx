"use client";

import { useState } from "react";
import Link from "next/link";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getBotDifficultyDescription,
  type BotDifficulty,
} from "@/lib/bot";
import { cn } from "@/lib/utils";

const BOT_DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard"];

const DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function BotMatchCard() {
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <Ghost className="size-5" />
        </div>
        <CardTitle>Play vs bot</CardTitle>
        <CardDescription>
          Start instantly — no waiting. Choose a difficulty: Easy is slower and
          makes more mistakes; Medium is faster and sharper; Hard answers in 5
          seconds and never misses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {BOT_DIFFICULTIES.map((level) => {
            const selected = difficulty === level;

            return (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-violet-500/50 bg-violet-500/15"
                    : "border-border/60 bg-card/40 hover:border-violet-500/30 hover:bg-violet-500/5"
                )}
              >
                <p className="font-semibold">{DIFFICULTY_LABELS[level]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getBotDifficultyDescription(level)}
                </p>
              </button>
            );
          })}
        </div>

        <Button asChild variant="secondary" className="min-h-11 w-full">
          <Link href={`/dashboard/matchmaking?mode=bot&difficulty=${difficulty}`}>
            Start {DIFFICULTY_LABELS[difficulty].toLowerCase()} bot match
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
