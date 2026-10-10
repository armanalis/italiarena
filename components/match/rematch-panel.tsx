"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { offerRematch, type RematchState } from "@/app/dashboard/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { armMatchmakingAutosearch } from "@/lib/matchmaking-intent";
import { createClient } from "@/utils/supabase/client";

/** KEEP IN SYNC with the 6-second window in supabase/rematch-2026-10-10.sql. */
const CHECK_IN_MS = 2_000;

/**
 * End of a live match, like chess.com: either player offers a rematch and it
 * starts once both have. Nobody has to decline; leaving is enough.
 */
export function RematchPanel({
  sessionId,
  opponentName,
  onLeave,
}: {
  sessionId: string;
  opponentName: string;
  /** Clears the finished match before navigating away. */
  onLeave: () => void;
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  // Null until the first check-in, or while a rematch is not available.
  const [state, setState] = useState<RematchState | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  // After a failed start, wait for a click instead of retrying every check-in.
  const failed = useRef(false);

  const offer = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setPending(true);
    const result = await offerRematch(sessionId);
    if (result.success && result.sessionId) {
      // Stays busy: we are on our way into the rematch.
      onLeave();
      router.push(`/dashboard/match/${result.sessionId}`);
      return;
    }
    busy.current = false;
    setPending(false);
    if (!result.success) {
      failed.current = true;
      toast.error(result.error);
    } else {
      setState((current) => current && { ...current, offered: true });
    }
  }, [onLeave, router, sessionId]);

  // Checking in keeps our offer alive and shows the other player's.
  useEffect(() => {
    let stopped = false;
    async function checkIn() {
      const { data } = await supabase.rpc("rematch_poll", {
        p_session_id: sessionId,
        p_offer: false,
      });
      if (stopped || !data) {
        return;
      }
      const next = data as RematchState;
      setState(next);
      // Both are in, or the other screen already started it: go.
      if ((next.session_id || next.both) && !failed.current) {
        void offer();
      }
    }
    void checkIn();
    const timer = window.setInterval(() => void checkIn(), CHECK_IN_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [offer, sessionId, supabase]);

  const note = state?.they_left
    ? `${opponentName} has left.`
    : state?.offered
      ? `Rematch offered. Waiting for ${opponentName}…`
      : state?.they_offered
        ? `${opponentName} wants a rematch!`
        : null;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3 border-t border-border/60 pt-6">
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium">
        {note}
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          disabled={!state || state.offered || state.they_left || pending}
          onClick={() => {
            failed.current = false;
            void offer();
          }}
        >
          {pending || state?.offered ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          {state?.they_offered && !state.offered ? "Accept rematch" : "Rematch"}
        </Button>
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link
            href="/dashboard/matchmaking"
            onClick={() => {
              armMatchmakingAutosearch();
              onLeave();
            }}
          >
            Find someone else
          </Link>
        </Button>
        <Button asChild variant="ghost" className="min-h-11 w-full sm:w-auto">
          <Link href="/dashboard" onClick={onLeave}>
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
