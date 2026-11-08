"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBrowserValue } from "@/hooks/use-browser-value";
import { navigateTo } from "@/lib/client-navigation";
import {
  isChunkLoadError,
  isConnectionError,
  reloadOnceAfterChunkError,
} from "@/lib/errors";
import { UI_LANGUAGE_COOKIE } from "@/lib/i18n";
import { useGameStore } from "@/store/useGameStore";
import "./globals.css";

const RECONNECT_INTERVAL_MS = 3000;

// Shown when the root layout itself failed, so outside the app's language
// provider: its own few lines, in the language the ui_lang cookie names.
const TEXT = {
  en: {
    updatingTitle: "Updating the app...",
    updatingBody: "A new version was deployed while this tab was open. Reloading to fetch the latest files.",
    reconnectingTitle: "Reconnecting to Arena...",
    reconnectingBody: "Connection dropped mid-match. Clearing local state and restoring your session.",
    retry: "Retry",
    errorTitle: "Something went wrong",
    errorBody:
      "An unexpected error occurred. Your match review is still saved in this tab until you leave — use Back to the Arena when you are ready to start fresh.",
    reloadNow: "Reload now",
    tryAgain: "Try again",
    back: "Back to the Arena",
  },
  tr: {
    updatingTitle: "Uygulama güncelleniyor...",
    updatingBody: "Bu sekme açıkken yeni bir sürüm yayınlandı. En son dosyaları almak için yeniden yükleniyor.",
    reconnectingTitle: "Arena'ya yeniden bağlanılıyor...",
    reconnectingBody: "Maçın ortasında bağlantı koptu. Yerel durum temizlenip oturumun geri yükleniyor.",
    retry: "Deneme",
    errorTitle: "Bir şeyler ters gitti",
    errorBody:
      "Beklenmedik bir hata oluştu. Maç incelemen sen ayrılana kadar bu sekmede kayıtlı kalıyor; baştan başlamaya hazır olduğunda Arena'ya dön'e bas.",
    reloadNow: "Şimdi yeniden yükle",
    tryAgain: "Tekrar dene",
    back: "Arena'ya dön",
  },
} as const;

function cookieLanguage(): keyof typeof TEXT {
  return new RegExp(`(?:^|; )${UI_LANGUAGE_COOKIE}=tr(?:;|$)`).test(document.cookie) ? "tr" : "en";
}

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [attempt, setAttempt] = useState(0);
  const language = useBrowserValue(cookieLanguage, "en");
  const text = TEXT[language];
  const staleBundle = isChunkLoadError(error);
  const connectionDrop = isConnectionError(error);

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
    navigateTo("/");
  }

  return (
    <html lang={language}>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="w-full max-w-md space-y-6">
            {staleBundle ? (
              <Alert className="border-primary/30 bg-primary/10">
                <Loader2 className="animate-spin text-primary" />
                <AlertTitle>{text.updatingTitle}</AlertTitle>
                <AlertDescription>{text.updatingBody}</AlertDescription>
              </Alert>
            ) : connectionDrop ? (
              <Alert className="border-primary/30 bg-primary/10">
                <Loader2 className="animate-spin text-primary" />
                <AlertTitle>{text.reconnectingTitle}</AlertTitle>
                <AlertDescription>
                  {text.reconnectingBody}
                  {attempt > 0 && (
                    <span className="mt-2 block font-mono text-xs tabular-nums">
                      {text.retry} {attempt}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <ShieldAlert />
                <AlertTitle>{text.errorTitle}</AlertTitle>
                <AlertDescription>{text.errorBody}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="min-h-11 flex-1" onClick={handleTryAgain}>
                <RefreshCw className="size-4" />
                {staleBundle ? text.reloadNow : text.tryAgain}
              </Button>
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                onClick={handleBackToDashboard}
              >
                {text.back}
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
