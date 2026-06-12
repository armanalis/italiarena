"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { navigateTo } from "@/lib/client-navigation";
import {
  isChunkLoadError,
  isConnectionError,
  reloadOnceAfterChunkError,
} from "@/lib/errors";
import { useGameStore } from "@/store/useGameStore";
import "./globals.css";

const RECONNECT_INTERVAL_MS = 3000;

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [attempt, setAttempt] = useState(0);
  const staleBundle = isChunkLoadError(error);
  const connectionDrop = isConnectionError(error);
  const recoverable = connectionDrop || staleBundle;

  useEffect(() => {
    if (staleBundle) {
      reloadOnceAfterChunkError();
      return;
    }

    if (!connectionDrop) {
      return;
    }

    const timer = window.setInterval(() => {
      setAttempt((current) => current + 1);
      reset();
    }, RECONNECT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [connectionDrop, staleBundle, reset]);

  function handleTryAgain() {
    useGameStore.getState().reset();
    if (staleBundle) {
      reloadOnceAfterChunkError();
      return;
    }
    reset();
  }

  function handleBackToDashboard() {
    useGameStore.getState().reset();
    navigateTo("/dashboard");
  }

  return (
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="w-full max-w-md space-y-6">
            {staleBundle ? (
              <Alert className="border-primary/30 bg-primary/10">
                <Loader2 className="animate-spin text-primary" />
                <AlertTitle>Updating the app...</AlertTitle>
                <AlertDescription>
                  A new version was deployed while this tab was open. Reloading
                  to fetch the latest files.
                </AlertDescription>
              </Alert>
            ) : connectionDrop ? (
              <Alert className="border-primary/30 bg-primary/10">
                <Loader2 className="animate-spin text-primary" />
                <AlertTitle>Reconnecting to Arena...</AlertTitle>
                <AlertDescription>
                  Connection dropped mid-match. Clearing local state and
                  restoring your session.
                  {attempt > 0 && (
                    <span className="mt-2 block font-mono text-xs tabular-nums">
                      Retry {attempt}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <ShieldAlert />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  An unexpected error occurred. Your match review is still saved
                  in this tab until you leave — use Back to dashboard when you are
                  ready to start fresh.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="min-h-11 flex-1" onClick={handleTryAgain}>
                <RefreshCw className="size-4" />
                {staleBundle ? "Reload now" : "Try again"}
              </Button>
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                onClick={handleBackToDashboard}
              >
                Back to dashboard
              </Button>
            </div>

            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ""}
            </pre>
          </div>
        </main>
      </body>
    </html>
  );
}
