"use client";

import { useEffect } from "react";
import {
  clearChunkReloadFlag,
  errorFromUnknown,
  isChunkLoadError,
  reloadOnceAfterChunkError,
} from "@/lib/errors";

/**
 * Catches stale-bundle chunk failures during navigation (common after a deploy
 * while a match tab is still open) and reloads once to fetch the new assets.
 */
export function StaleChunkRecovery() {
  useEffect(() => {
    clearChunkReloadFlag();

    function handleChunkFailure(value: unknown) {
      const error = errorFromUnknown(value);
      if (!isChunkLoadError(error)) {
        return;
      }
      reloadOnceAfterChunkError();
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      handleChunkFailure(event.reason);
    }

    function onError(event: ErrorEvent) {
      if (event.error) {
        handleChunkFailure(event.error);
      }
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
