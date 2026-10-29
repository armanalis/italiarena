"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";
import { Popover } from "radix-ui";
import { toast } from "sonner";
import { switchLanguage } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  LANGUAGE_META,
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGES,
  type TargetLanguage,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Header button: which language every game uses. A new language asks for a level first. */
export function LanguageSwitcher({ language }: { language: TargetLanguage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [askLevelFor, setAskLevelFor] = useState<TargetLanguage | null>(null);
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
          toast.error(result.error);
        }
        return;
      }
      setOpen(false);
      setAskLevelFor(null);
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
          className="min-h-10 gap-1.5 px-2 font-semibold uppercase sm:px-3"
          aria-label={`Learning ${language}. Change language`}
        >
          <Languages className="size-3.5" aria-hidden />
          {LANGUAGE_META[language].code}
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
              <p className="font-medium">Your {askLevelFor} level</p>
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
            TARGET_LANGUAGES.map((option) => (
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
                <span className="w-6 text-xs font-bold uppercase text-muted-foreground">
                  {LANGUAGE_META[option].code}
                </span>
                <span className="flex-1">
                  {option} <span className="text-muted-foreground">· {LANGUAGE_META[option].label}</span>
                </span>
                {option === language && <Check className="size-4" aria-hidden />}
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
