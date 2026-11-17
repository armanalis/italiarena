"use client";

import type { ReactNode } from "react";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
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
};

/** Past days, newest first, grouped by month. Shared by the Sprint and the Word Wheel. */
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
  return (
    <section className="space-y-4" aria-label={t("Archive")}>
      <h2 className="text-sm font-semibold">{t("Archive · {level}", { level })}</h2>
      {monthGroups(days).map((group) => (
        <div key={group.month} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-tight">
            {archiveDate(group.days[0].date, uiLanguage, { month: "long", year: "numeric" })}
          </h3>
          <ul className="grid grid-cols-2 gap-3">
            {group.days.map((day) => (
              <li key={day.date}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(day.date)}
                  aria-current={selectedDate === day.date ? "date" : undefined}
                  className={cn(
                    "flex min-h-24 w-full flex-col items-start justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors hover:bg-muted",
                    day.played ? "border-border bg-card" : "border-dashed border-border",
                    selectedDate === day.date && "border-solid border-primary ring-2 ring-primary/25"
                  )}
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {archiveDate(day.date, uiLanguage, { weekday: "short" })}
                  </span>
                  <span className="text-lg font-semibold leading-none tracking-tight">
                    {archiveDate(day.date, uiLanguage, { day: "numeric" })}
                  </span>
                  {day.played ? (
                    typeof day.status === "string" || typeof day.status === "number" ? (
                      <span className="text-2xl font-bold tabular-nums leading-none text-primary">{day.status}</span>
                    ) : (
                      day.status
                    )
                  ) : (
                    <span className="text-sm font-semibold text-primary">{t("Play")}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
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
