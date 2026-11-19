"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { Popover } from "radix-ui";
import { toast } from "sonner";
import { switchLanguage } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  LANGUAGE_META,
  languageFromCode,
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGES,
  type TargetLanguage,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

/** Header button: which language every game uses. A new language asks for a level first. */
export function LanguageSwitcher({ language }: { language: TargetLanguage }) {
  const router = useRouter();
  const t = useT();
  const pathname = usePathname();
  // A /german link for a player with no German level yet lands on ?lang=de: ask for it.
  const linked = languageFromCode(useSearchParams().get("lang") ?? undefined);
  const askLinked = linked && linked !== language ? linked : null;
  const [open, setOpen] = useState(askLinked !== null);
  const [askLevelFor, setAskLevelFor] = useState<TargetLanguage | null>(askLinked);
  const [pending, startTransition] = useTransition();

  function choose(next: TargetLanguage, level?: string) {
    if (next === language && !level) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await switchLanguage(next, level);
      if (!result.success) {
        if ("needsLevel" in result) {
          setAskLevelFor(next);
        } else {
          toast.error(t(result.error));
        }
        return;
      }
      setOpen(false);
      setAskLevelFor(null);
      if (linked) {
        router.replace(pathname);
      }
      router.refresh();
    });
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setAskLevelFor(null);
      }}
    >
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          // The language being learned, not the app's own: tinted, and named on wider screens.
          className="min-h-10 gap-1.5 border-primary/50 bg-primary/10 px-2 text-primary hover:bg-primary/15 sm:px-3"
          aria-label={t("Learning {language}. Change language", { language: t(language) })}
        >
          <Languages className="size-3.5" aria-hidden />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{t("Learning")}</span>
          <span className="hidden font-semibold sm:inline">{t(language)}</span>
          {/* lang: a code, not a word; a Turkish page would capitalise "it" as "İT". */}
          <span lang="en" className="font-semibold uppercase sm:hidden">
            {LANGUAGE_META[language].code}
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-60 space-y-1 rounded-xl border border-border bg-popover p-2 text-sm text-popover-foreground shadow-md outline-none"
        >
          {askLevelFor ? (
            <div className="space-y-2 p-2">
              <p className="font-medium">{t("Your {language} level", { language: t(askLevelFor) })}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PROFICIENCY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    disabled={pending}
                    onClick={() => choose(askLevelFor, level)}
                    className="min-h-11 rounded-lg border border-border px-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Language you are learning")}
              </p>
              {TARGET_LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => choose(option)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left hover:bg-muted disabled:opacity-60",
                  option === language && "font-semibold"
                )}
              >
                <span lang="en" className="w-6 text-xs font-bold uppercase text-muted-foreground">
                  {LANGUAGE_META[option].code}
                </span>
                <span className="flex-1">
                  {t(option)} <span lang={LANGUAGE_META[option].code} className="text-muted-foreground">· {LANGUAGE_META[option].label}</span>
                </span>
                {option === language && <Check className="size-4" aria-hidden />}
              </button>
              ))}
              <p className="border-t border-border px-3 pb-1 pt-2 text-xs text-muted-foreground">
                {t("Menus and buttons stay in your app language (Settings).")}
              </p>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
