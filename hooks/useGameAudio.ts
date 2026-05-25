"use client";

import { useCallback, useEffect, useRef } from "react";
import { isSoundEnabled } from "@/lib/preferences";

export type GameSound = "reveal" | "click" | "correct" | "incorrect";

const SOUND_PATHS: Record<GameSound, string> = {
  reveal: "/sounds/reveal.mp3",
  click: "/sounds/click.mp3",
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
};

function playTone(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.08
) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playFallbackSound(audioContext: AudioContext, sound: GameSound) {
  switch (sound) {
    case "reveal":
      playTone(audioContext, 880, 0.08);
      break;
    case "click":
      playTone(audioContext, 520, 0.05, "triangle", 0.06);
      break;
    case "correct":
      playTone(audioContext, 660, 0.1);
      setTimeout(() => playTone(audioContext, 880, 0.12), 90);
      break;
    case "incorrect":
      playTone(audioContext, 220, 0.18, "sawtooth", 0.05);
      break;
  }
}

/** Loads lightweight sfx on mount and plays them at state boundaries. */
export function useGameAudio() {
  const audioMapRef = useRef<Partial<Record<GameSound, HTMLAudioElement>>>({});
  const fallbackContextRef = useRef<AudioContext | null>(null);
  const failedLoadsRef = useRef<Set<GameSound>>(new Set());

  useEffect(() => {
    (Object.keys(SOUND_PATHS) as GameSound[]).forEach((sound) => {
      const audio = new Audio(SOUND_PATHS[sound]);
      audio.preload = "auto";
      audio.load();
      audioMapRef.current[sound] = audio;

      audio.addEventListener("error", () => {
        failedLoadsRef.current.add(sound);
      });
    });

    return () => {
      audioMapRef.current = {};
    };
  }, []);

  const ensureFallbackContext = useCallback(() => {
    if (!fallbackContextRef.current) {
      fallbackContextRef.current = new AudioContext();
    }

    if (fallbackContextRef.current.state === "suspended") {
      void fallbackContextRef.current.resume();
    }

    return fallbackContextRef.current;
  }, []);

  const play = useCallback(
    (sound: GameSound) => {
      if (!isSoundEnabled()) {
        return;
      }

      const audio = audioMapRef.current[sound];

      if (audio && !failedLoadsRef.current.has(sound)) {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          failedLoadsRef.current.add(sound);
          playFallbackSound(ensureFallbackContext(), sound);
        });
        return;
      }

      playFallbackSound(ensureFallbackContext(), sound);
    },
    [ensureFallbackContext]
  );

  return { play };
}
