"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Settings: always show horizontal slider on desktop, popup on mobile. */
  showSlider?: boolean;
  /** Match UI: hide slider until the user opens it; slider is vertical. */
  collapsible?: boolean;
};

function HorizontalVolumeSlider({
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

function volumeFromPointer(clientY: number, track: HTMLElement) {
  const rect = track.getBoundingClientRect();
  const ratio = 1 - (clientY - rect.top) / rect.height;
  return Math.round(Math.max(0, Math.min(100, ratio * 100)));
}

function VerticalVolumeSlider({
  volume,
  onChange,
  className,
}: {
  volume: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromPointer = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }
      onChange(volumeFromPointer(clientY, track));
    },
    [onChange]
  );

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!draggingRef.current) {
        return;
      }
      updateFromPointer(event.clientY);
    }

    function handlePointerUp() {
      draggingRef.current = false;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateFromPointer]);

  const fillPercent = volume;
  const thumbOffset = `max(0px, min(calc(100% - 0.625rem), calc(${fillPercent}% - 0.3125rem)))`;

  return (
    <div className={cn("flex flex-col items-center gap-1.5 py-0.5", className)}>
      <Volume2 className="size-3 shrink-0 text-foreground/60" aria-hidden />

      <div
        ref={trackRef}
        role="slider"
        aria-label="Sound volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volume}
        aria-orientation="vertical"
        tabIndex={0}
        className="relative h-[5.25rem] w-6 cursor-pointer touch-none select-none"
        onPointerDown={(event) => {
          draggingRef.current = true;
          trackRef.current?.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowRight") {
            event.preventDefault();
            onChange(Math.min(100, volume + 5));
          } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
            event.preventDefault();
            onChange(Math.max(0, volume - 5));
          } else if (event.key === "Home") {
            event.preventDefault();
            onChange(100);
          } else if (event.key === "End") {
            event.preventDefault();
            onChange(0);
          }
        }}
      >
        <div className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 overflow-hidden rounded-full bg-white/20">
          <div
            className="absolute inset-x-0 bottom-0 rounded-full bg-white transition-[height] duration-75"
            style={{ height: `${fillPercent}%` }}
            aria-hidden
          />
        </div>
        <div
          className="pointer-events-none absolute left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0_/_0.35)] transition-[bottom] duration-75"
          style={{ bottom: thumbOffset }}
          aria-hidden
        />
      </div>

      <button
        type="button"
        className="rounded-md p-0.5 text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
        aria-label="Mute sound"
        onClick={() => onChange(0)}
      >
        <VolumeX className="size-3 shrink-0" />
      </button>
    </div>
  );
}

export function SoundVolumeControl({
  className,
  showSlider = false,
  collapsible = false,
}: SoundVolumeControlProps) {
  const [volume, setVolume] = useState(DEFAULT_SOUND_VOLUME);
  const [open, setOpen] = useState(false);
  const lastVolumeRef = useRef(DEFAULT_SOUND_VOLUME);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedVolume = getSoundVolume();
    setVolume(storedVolume);
    if (storedVolume > 0) {
      lastVolumeRef.current = storedVolume;
    }
  }, []);

  useEffect(() => {
    if (!collapsible || !open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [collapsible, open]);

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

  function handleButtonClick() {
    if (collapsible) {
      setOpen((current) => !current);
      return;
    }

    toggleMute();
  }

  return (
    <div ref={rootRef} className={cn("relative flex items-center gap-2", className)}>
      {!collapsible && (
        <HorizontalVolumeSlider
          volume={volume}
          onChange={persistVolume}
          className="hidden md:flex"
        />
      )}

      {!collapsible && showSlider && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-50 rounded-xl border border-border/60 bg-popover p-3 shadow-lg md:hidden">
          <HorizontalVolumeSlider
            volume={volume}
            onChange={persistVolume}
            className="w-[min(240px,calc(100vw-4rem))]"
          />
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 min-h-11 min-w-11 shrink-0"
        aria-label={
          collapsible
            ? open
              ? "Close volume control"
              : "Open volume control"
            : volume > 0
              ? "Mute sound"
              : "Unmute sound"
        }
        aria-expanded={collapsible ? open : undefined}
        aria-pressed={!collapsible && volume === 0}
        onClick={handleButtonClick}
      >
        {volume > 0 ? (
          <Volume2 className="size-4" />
        ) : (
          <VolumeX className="size-4" />
        )}
      </Button>

      {collapsible && open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 animate-in fade-in-0 zoom-in-95 rounded-lg border border-white/10 bg-[#2a3138]/95 px-1.5 py-1.5 shadow-[0_4px_20px_rgb(0_0_0_/_0.45)] backdrop-blur-sm duration-150"
          role="dialog"
          aria-label="Sound volume"
        >
          <VerticalVolumeSlider volume={volume} onChange={persistVolume} />
        </div>
      )}
    </div>
  );
}
