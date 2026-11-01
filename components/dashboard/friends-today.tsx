/** "Today with friends": who played what today, best score first. Shared by the home page and the Friends panel. */
import type { TargetLanguage } from "@/lib/constants";
import { todayResults, type FriendToday } from "@/lib/friends-today";
import { cn } from "@/lib/utils";

export function FriendsTodayList({ rows, language }: { rows: FriendToday[]; language: TargetLanguage }) {
  const played = rows.filter((row) => todayResults(row, language).length > 0);
  if (!played.some((row) => !row.is_me)) {
    return <p className="text-sm text-muted-foreground">None of your friends has played today yet.</p>;
  }

  return (
    <ol className="space-y-1.5">
      {played.map((row, index) => (
        <li
          key={row.user_id}
          className={cn("flex gap-2 rounded-lg px-3 py-2 text-sm", row.is_me ? "bg-primary/10" : "bg-muted/40")}
        >
          <span className="w-4 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.display_name}</span>
            <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {todayResults(row, language).map(({ label, level }) => (
                <span key={label}>
                  <span className="font-medium text-foreground">{label}</span> {level}
                </span>
              ))}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
