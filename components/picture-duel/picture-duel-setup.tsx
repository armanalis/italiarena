"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JoinCodeForm } from "@/components/challenge/join-code-form";
import { ALL_TOPICS, createDuel, findDuelByCode, PICTURE_LEVELS, type PictureTopic } from "@/lib/picture-duel";
import { isTargetLanguage, LANGUAGE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fill, useT } from "@/components/ui-language-provider";
import { createClient } from "@/utils/supabase/client";

/** A friend's code opens their invitation, where Play joins (the countdown must not start mid-navigation). */
async function joinByCode(code: string) {
  const found = await findDuelByCode(createClient(), code);
  if (!found.ok) return { error: found.error };
  return found.value
    ? { href: `/picture-duel/${found.value}` }
    : { error: "No open duel has this code. Check it, or ask for a new one." };
}

const chip = (active: boolean) =>
  cn(
    "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground hover:bg-muted"
  );

/** Level and mode chips, then one card per topic: tapping a topic opens its lobby with the link to share. */
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
  const t = useT();
  const [level, setLevel] = useState(initialLevel);
  const [hard, setHard] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const shown = topics.filter((topic) => topic.level === level);
  const [withArticle, bare] = language === "German" ? ["das Brot", "Brot"] : ["il pane", "pane"];
  const code = isTargetLanguage(language) ? LANGUAGE_META[language].code : undefined;

  async function open(topic: string) {
    setOpening(topic);
    const created = await createDuel(createClient(), language, level, topic, hard);
    if (created.ok) {
      router.push(`/picture-duel/${created.value}`);
    } else {
      toast.error(t(created.error));
      setOpening(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("Picture Duel")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("You and a friend, 60 seconds each, like a chess clock. Name the picture in {language} to stop your clock and start theirs. Pass shows the answer, but your clock keeps running. Whoever runs out of time first loses.", { language: t(language) })}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold">{t("Got a code from a friend?")}</p>
        <JoinCodeForm join={joinByCode} className="flex-[1_1_11rem]" />
      </div>

      <div className="flex gap-2" role="group" aria-label={t("Level")}>
        {PICTURE_LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === level}
            disabled={opening !== null}
            onClick={() => setLevel(option)}
            className={chip(option === level)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2" role="group" aria-label="Mode">
          {[false, true].map((option) => (
            <button
              key={String(option)}
              type="button"
              aria-pressed={option === hard}
              disabled={opening !== null}
              onClick={() => setHard(option)}
              className={chip(option === hard)}
            >
              {option ? t("Hard") : t("Normal")}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {hard
            ? fill(t("Hard: type the article too. {right} is right, {wrong} is not."), {
                right: <span lang={code}>{withArticle}</span>,
                wrong: <span lang={code}>{bare}</span>,
              })
            : fill(t("Normal: the article is optional, {bare} or {full}."), {
                bare: <span lang={code}>{bare}</span>,
                full: <span lang={code}>{withArticle}</span>,
              })}
        </p>
      </div>

      {shown.length > 0 && (
        <section aria-labelledby="mix-heading" className="space-y-2">
          <h2 id="mix-heading" className="text-sm font-semibold">
            {t("Random mix")}
          </h2>
          <button
            type="button"
            disabled={opening !== null}
            onClick={() => void open(ALL_TOPICS)}
            className="glass-panel flex min-h-20 w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
          >
            {opening === ALL_TOPICS ? (
              <Loader2 className="size-8 shrink-0 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <span className="text-4xl leading-none" aria-hidden>
                🎲
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(ALL_TOPICS)}</span>
              <span className="block text-xs text-muted-foreground">
                {t("Random pictures from every {level} topic · {n} pictures", {
                  level,
                  n: shown.reduce((sum, topic) => sum + topic.count, 0),
                })}
              </span>
            </span>
          </button>
        </section>
      )}

      <section aria-labelledby="topics-heading" className="space-y-2">
        <h2 id="topics-heading" className="text-sm font-semibold">
          {t("Pick a topic, then send the link to a friend")}
        </h2>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No topics for this level yet.")}</p>
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
                <span className="text-sm font-semibold">{t(topic.topic)}</span>
                <span className="text-xs text-muted-foreground">{t("{n} pictures", { n: topic.count })}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
