"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SOUND_VOLUME,
  getSoundVolume,
  readGameplayPreferences,
  writeGameplayPreferences,
} from "@/lib/preferences";
import { cn } from "@/lib/utils";

type SoundVolumeControlProps = {
  className?: string;
  showSlider?: boolean;
};

export function SoundVolumeControl({
  className,
  showSlider = false,
}: SoundVolumeControlProps) {
  const [volume, setVolume] = useState(DEFAULT_SOUND_VOLUME);
  const [expanded, setExpanded] = useState(showSlider);
  const lastVolumeRef = useRef(DEFAULT_SOUND_VOLUME);

  useEffect(() => {
    setVolume(getSoundVolume());
  }, []);

  function persistVolume(nextVolume: number) {
    setVolume(nextVolume);
    if (nextVolume > 0) {
      lastVolumeRef.current = nextVolume;
    }
    writeGameplayPreferences({
      ...readGameplayPreferences(),
      soundVolume: nextVolume,
      soundEnabled: nextVolume > 0,
    });
  }

  function toggleMute() {
    if (volume > 0) {
      persistVolume(0);
      return;
    }

    persistVolume(lastVolumeRef.current || DEFAULT_SOUND_VOLUME);
  }

  const panelOpen = showSlider || expanded;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {panelOpen && (
        <div className="flex min-w-[112px] max-w-[168px] flex-1 items-center gap-2">
          <VolumeX className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            aria-label="Sound volume"
            onChange={(event) => persistVolume(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-indigo-500"
          />
          <Volume2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-6 text-right text-xs tabular-nums text-muted-foreground">
            {volume}
          </span>
        </div>
      )}

      {!showSlider && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          aria-label={panelOpen ? "Hide volume slider" : "Show volume slider"}
          aria-expanded={panelOpen}
          onClick={() => setExpanded((current) => !current)}
        >
          {volume > 0 ? (
            <Volume2 className="size-4" />
          ) : (
            <VolumeX className="size-4" />
          )}
        </Button>
      )}

      {showSlider && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          aria-label={volume > 0 ? "Mute sound" : "Unmute sound"}
          onClick={toggleMute}
        >
          {volume > 0 ? (
            <Volume2 className="size-4" />
          ) : (
            <VolumeX className="size-4" />
          )}
        </Button>
      )}
    </div>
  );
}
