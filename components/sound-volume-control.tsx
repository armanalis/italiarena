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

function VolumeSlider({
  volume,
  onChange,
  className,
}: {
  volume: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-[112px] max-w-[168px] items-center gap-2", className)}>
      <VolumeX className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        aria-label="Sound volume"
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full min-w-0 cursor-pointer touch-target accent-primary"
      />
      <Volume2 className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-6 text-right text-xs tabular-nums text-muted-foreground">
        {volume}
      </span>
    </div>
  );
}

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
    <div className={cn("relative flex items-center gap-2", className)}>
      {panelOpen && (
        <VolumeSlider
          volume={volume}
          onChange={persistVolume}
          className="hidden md:flex"
        />
      )}

      {panelOpen && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-50 rounded-xl border border-border/60 bg-popover p-3 shadow-lg md:hidden">
          <VolumeSlider
            volume={volume}
            onChange={persistVolume}
            className="w-[min(240px,calc(100vw-4rem))]"
          />
        </div>
      )}

      {!showSlider && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 min-h-11 min-w-11 shrink-0"
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
          className="size-10 min-h-11 min-w-11 shrink-0"
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
