"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBotDifficultyDescription, type BotDifficulty } from "@/lib/bot";
import { armMatchmakingAutosearch } from "@/lib/matchmaking-intent";

const BOT_DIFFICULTIES: { level: BotDifficulty; label: string }[] = [
  { level: "easy", label: "Easy" },
  { level: "medium", label: "Medium" },
  { level: "hard", label: "Hard" },
];

/** Opened from "Play with bots" in the sidebar: picking a difficulty starts the match. */
export function BotPickerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Play with a bot</DialogTitle>
          <DialogDescription>Which difficulty do you want to play? The match starts at once.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {BOT_DIFFICULTIES.map(({ level, label }) => (
            <Link
              key={level}
              href={`/matchmaking?mode=bot&difficulty=${level}`}
              onClick={() => {
                armMatchmakingAutosearch();
                onOpenChange(false);
              }}
              className="touch-target flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted"
            >
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {getBotDifficultyDescription(level)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
