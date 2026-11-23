"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Popover } from "radix-ui";
import { Button } from "@/components/ui/button";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
import { modeCard, modeText, type PlayMode } from "@/lib/mode-colors";
import { cn } from "@/lib/utils";

export type DayArchiveItem = {
  date: string;
  /** Started or finished. An unplayed day is dashed and says Play. */
  played: boolean;
  /**
   * Bottom of a played card. A number or string is the big score.
   * Anything else is shown as given (a score plus a second line).
   */
  status?: ReactNode;
  /** Normal or hard: tints the card so the archive shows the mode at a glance. */
  mode?: PlayMode;
};

/** Past days, newest first, grouped by month: a button that opens them in a popup. Shared by the Sprint and the Word Wheel. */
export function DayArchive({
  level,
  days,
  selectedDate,
  disabled,
  onSelect,
}: {
  level: string;
  days: DayArchiveItem[];
  selectedDate?: string | null;
  disabled?: boolean;
  onSelect: (date: string) => void;
}) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const [open, setOpen] = useState(false);
  const played = days.filter((day) => day.played).length;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* The div keeps the button its own width inside stretched columns. */}
      <div className="flex">
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-10 gap-2 border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
          >
            <CalendarDays className="size-4" aria-hidden />
            {t("Archive · {level}", { level })}
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums text-primary-foreground">
              {played}/{days.length}
            </span>
          </Button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label={t("Archive")}
          className="z-50 max-h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
        >
          {days.some((day) => day.mode) && (
            <p className="flex gap-3 text-xs font-medium">
              {(["normal", "hard"] as const).map((mode) => (
                <span key={mode} className="flex items-center gap-1.5">
                  <span className={cn("size-3 rounded border", modeCard[mode])} aria-hidden />
                  <span className={modeText[mode]}>{t(mode === "hard" ? "Hard" : "Normal")}</span>
                </span>
              ))}
            </p>
          )}
          {monthGroups(days).map((group) => (
            <div key={group.month} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {archiveDate(group.days[0].date, uiLanguage, { month: "long", year: "numeric" })}
              </h3>
              <ul className="grid grid-cols-4 gap-1.5">
                {group.days.map((day) => (
                  <li key={day.date}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setOpen(false);
                        onSelect(day.date);
                      }}
                      aria-current={selectedDate === day.date ? "date" : undefined}
                      className={cn(
                        "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition-colors hover:bg-muted",
                        day.played ? (day.mode ? modeCard[day.mode] : "border-border bg-card") : "border-dashed border-border",
                        selectedDate === day.date && "border-solid border-primary ring-2 ring-primary/25"
                      )}
                    >
                      <span className="text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">
                        {archiveDate(day.date, uiLanguage, { weekday: "short" })} {archiveDate(day.date, uiLanguage, { day: "numeric" })}
                      </span>
                      {day.played ? (
                        typeof day.status === "string" || typeof day.status === "number" ? (
                          <span className={cn("text-sm font-bold tabular-nums leading-none", day.mode ? modeText[day.mode] : "text-primary")}>{day.status}</span>
                        ) : (
                          day.status
                        )
                      ) : (
                        <span className="text-[0.65rem] font-semibold text-primary">{t("Play")}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function monthGroups(days: DayArchiveItem[]): { month: string; days: DayArchiveItem[] }[] {
  const groups: { month: string; days: DayArchiveItem[] }[] = [];
  for (const day of days) {
    const month = day.date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.month === month) last.days.push(day);
    else groups.push({ month, days: [day] });
  }
  return groups;
}

function archiveDate(date: string, language: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language, { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
