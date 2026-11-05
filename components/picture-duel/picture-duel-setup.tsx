"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JoinCodeForm } from "@/components/challenge/join-code-form";
import { createDuel, findDuelByCode, PICTURE_LEVELS, type PictureTopic } from "@/lib/picture-duel";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

/** A friend's code opens their invitation, where Play joins (the countdown must not start mid-navigation). */
async function joinByCode(code: string) {
  const found = await findDuelByCode(createClient(), code);
  if (!found.ok) return { error: found.error };
  return found.value
    ? { href: `/picture-duel/${found.value}` }
    : { error: "No open duel has this code. Check it, or ask for a new one." };
}

/** Level chips and one card per topic: tapping a topic opens its lobby with the link to share. */
export function PictureDuelSetup({
  language,
  initialLevel,
  topics,
}: {
  language: string;
  initialLevel: string;
  topics: PictureTopic[];
}) {
  const router = useRouter();
  const [level, setLevel] = useState(initialLevel);
  const [opening, setOpening] = useState<string | null>(null);
  const shown = topics.filter((topic) => topic.level === level);

  async function open(topic: string) {
    setOpening(topic);
    const created = await createDuel(createClient(), language, level, topic);
    if (created.ok) {
      router.push(`/picture-duel/${created.value}`);
    } else {
      toast.error(created.error);
      setOpening(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Picture Duel</h1>
        <p className="text-sm text-muted-foreground">
          You and a friend, 60 seconds each, like a chess clock. Name the picture in {language} to stop your
          clock and start theirs. Pass shows the answer, but your clock keeps running. Whoever runs out of time
          first loses.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold">Got a code from a friend?</p>
        <JoinCodeForm join={joinByCode} className="flex-[1_1_11rem]" />
      </div>

      <div className="flex gap-2" role="group" aria-label="Level">
        {PICTURE_LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === level}
            disabled={opening !== null}
            onClick={() => setLevel(option)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
              option === level
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <section aria-labelledby="topics-heading" className="space-y-2">
        <h2 id="topics-heading" className="text-sm font-semibold">
          Pick a topic, then send the link to a friend
        </h2>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topics for this level yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((topic) => (
              <button
                key={topic.topic}
                type="button"
                disabled={opening !== null}
                onClick={() => void open(topic.topic)}
                className="glass-panel flex min-h-24 flex-col items-center justify-center gap-1 p-3 text-center transition-colors hover:bg-muted disabled:opacity-60"
              >
                {opening === topic.topic ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  <span className="text-4xl leading-none" aria-hidden>
                    {topic.emoji}
                  </span>
                )}
                <span className="text-sm font-semibold">{topic.topic}</span>
                <span className="text-xs text-muted-foreground">{topic.count} pictures</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
