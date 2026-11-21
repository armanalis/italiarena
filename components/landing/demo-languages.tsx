"use client";

import { useState } from "react";
import { useT } from "@/components/ui-language-provider";
import { DemoRound } from "@/components/landing/demo-round";
import { Button } from "@/components/ui/button";
import type { TargetLanguage } from "@/lib/constants";
import type { DemoQuestion } from "@/lib/landing-demo-questions";

export type LanguageDemo = { language: TargetLanguage; questions: DemoQuestion[]; opponent: string };

/** One button per taught language; each opens its own three-question demo round. */
export function DemoLanguages({ demos, initial }: { demos: LanguageDemo[]; initial: TargetLanguage }) {
  const t = useT();
  const [language, setLanguage] = useState(initial);
  const demo = demos.find((d) => d.language === language) ?? demos[0];

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t("Language")} className="flex flex-wrap gap-2">
        {demos.map((d) => (
          <Button
            key={d.language}
            type="button"
            size="sm"
            variant={d.language === demo.language ? "default" : "outline"}
            aria-pressed={d.language === demo.language}
            onClick={() => setLanguage(d.language)}
            className="h-9 flex-1 px-4 sm:flex-none"
          >
            {t(d.language)}
          </Button>
        ))}
      </div>
      {/* key: a new language restarts the round from its intro. */}
      <DemoRound key={demo.language} questions={demo.questions} opponent={demo.opponent} />
    </div>
  );
}
