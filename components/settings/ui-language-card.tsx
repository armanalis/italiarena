"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUiLanguage } from "@/app/(app)/settings/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
import { UI_LANGUAGE_NAMES, UI_LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** English or Türkçe for menus and messages; each name is written in its own language. */
export function UiLanguageCard() {
  const t = useT();
  const current = useUiLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{t("App language")}</CardTitle>
        <CardDescription>{t("Menus, buttons and messages. The language you are learning stays the same.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2" role="group" aria-label={t("App language")}>
        {UI_LANGUAGES.map((option) => (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={option === current}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setUiLanguage(option);
                if (result.success) {
                  router.refresh();
                } else {
                  toast.error(t(result.error));
                }
              })
            }
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-60",
              option === current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            )}
          >
            {UI_LANGUAGE_NAMES[option]}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
