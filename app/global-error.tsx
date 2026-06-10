"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isConnectionError } from "@/lib/errors";
import { useGameStore } from "@/store/useGameStore";
import "./globals.css";

const RECONNECT_INTERVAL_MS = 3000;

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [attempt, setAttempt] = useState(0);
  const recoverable = isConnectionError(error);

  useEffect(() => {
    if (!recoverable) {
      return;
    }

    const timer = window.setInterval(() => {
      setAttempt((current) => current + 1);
      reset();
    }, RECONNECT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [recoverable, reset]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md space-y-6">
            {recoverable ? (
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
              <Button
                className="flex-1"
                onClick={() => {
                  useGameStore.getState().reset();
                  reset();
                }}
              >
                <RefreshCw className="size-4" />
                Try again
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  useGameStore.getState().reset();
                  window.location.href = "/dashboard";
                }}
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
