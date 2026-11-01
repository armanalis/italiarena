"use client";

import { useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TargetLanguage } from "@/lib/constants";
import { hasVoice, speak, subscribeToVoices } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** 🔊 Reads `text` aloud with an Italian or German voice; renders nothing when the device has none. */
export function SpeakButton({
  text,
  language,
  className,
}: {
  text: string;
  language: TargetLanguage;
  className?: string;
}) {
  const available = useSyncExternalStore(
    subscribeToVoices,
    () => hasVoice(language),
    () => false
  );
  if (!available) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-11 shrink-0 text-muted-foreground hover:text-primary", className)}
      aria-label={`Listen: ${text}`}
      title="Listen"
      onClick={() => speak(text, language)}
    >
      <Volume2 className="size-5" aria-hidden />
    </Button>
  );
}
