"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { badgeVariants } from "@/components/ui/badge";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

/** KEEP IN SYNC with the 2-minute window in online_counts (supabase/online-players-2026-10-10.sql). */
const ONLINE_HEARTBEAT_MS = 60_000;
const ONLINE_REFRESH_MS = 30_000;

/** Marks this player as online once a minute while the app is open. */
export function OnlineHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    // `.then` is what sends the request.
    const beat = () => void supabase.rpc("mark_online").then(() => undefined);

    beat();
    const interval = window.setInterval(beat, ONLINE_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}

/** "A2 · 5 online"; opens the online count of every level. */
export function OnlineLevelBadge({ level }: { level: string }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.rpc("online_counts");
      if (!cancelled && Array.isArray(data)) {
        const rows = data as { level: string; online: number }[];
        setCounts(Object.fromEntries(rows.map((row) => [row.level, row.online])));
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), ONLINE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // This player is online too, even before their first heartbeat is counted.
  const onlineIn = (other: string) =>
    Math.max(counts?.[other] ?? 0, other === level ? 1 : 0);

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          badgeVariants({ variant: "secondary" }),
          "h-auto cursor-pointer gap-1.5 rounded-full px-4 py-1.5 text-sm"
        )}
      >
        <span>{level}</span>
        {counts && (
          <span className="text-muted-foreground">· {onlineIn(level)} online</span>
        )}
        <ChevronDown />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-52 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-md border border-border outline-none"
        >
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            Online now
          </p>
          <ul className="space-y-0.5">
            {PROFICIENCY_LEVELS.map((other) => (
              <li
                key={other}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1",
                  other === level && "bg-secondary font-medium"
                )}
              >
                <span>
                  {other}
                  {other === level && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                <span className="tabular-nums">{counts ? onlineIn(other) : "–"}</span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
