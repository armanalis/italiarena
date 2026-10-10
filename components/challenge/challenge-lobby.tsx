"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Share2, Swords } from "lucide-react";
import { toast } from "sonner";
import {
  cancelMatchSearch,
  joinChallenge,
} from "@/app/dashboard/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type ChallengeLobbyProps = {
  sessionId: string;
  link: string;
  /** Six digits a friend can type on their Play page; null if not available. */
  code: string | null;
  state: "host" | "guest" | "not_for_you" | "closed";
  hostName: string | null;
  level: string | null;
};

/** How often the host checks whether the friend has joined. */
const JOIN_POLL_MS = 3_000;

export function ChallengeLobby({ sessionId, link, code, state, hostName, level }: ChallengeLobbyProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  // Host: go to the match as soon as the friend joins.
  useEffect(() => {
    if (state !== "host") {
      return;
    }

    const supabase = createClient();
    const interval = window.setInterval(async () => {
      const { data } = await supabase
        .from("game_sessions")
        .select("status")
        .eq("id", sessionId)
        .maybeSingle();
      if (data?.status === "active") {
        window.clearInterval(interval);
        router.replace(`/dashboard/match/${sessionId}`);
      }
    }, JOIN_POLL_MS);

    return () => window.clearInterval(interval);
  }, [router, sessionId, state]);

  async function copy(what: "link" | "code") {
    await navigator.clipboard.writeText(what === "code" && code ? code : link);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2_000);
  }

  async function shareLink() {
    if (!navigator.share) {
      await copy("link");
      return;
    }
    try {
      await navigator.share({
        title: "Italiarena challenge",
        text: code
          ? `Play an Italian quiz match with me! Open the link, or enter code ${code} on the Play page:`
          : "Play an Italian quiz match with me:",
        url: link,
      });
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  function cancel() {
    startTransition(async () => {
      await cancelMatchSearch(sessionId);
      router.replace("/dashboard");
    });
  }

  function join() {
    startTransition(async () => {
      const result = await joinChallenge(sessionId);
      if (result.success) {
        router.replace(`/dashboard/match/${result.sessionId}`);
      } else {
        toast.error(result.error);
        router.refresh();
      }
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="glass-panel w-full max-w-md space-y-6 p-6 text-center sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Swords className="size-7" />
        </div>

        {state === "host" && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Challenge a friend</h1>
              <p className="text-sm text-muted-foreground">
                Send this link to a friend{code ? ", or tell them the code to enter on their Play page" : ""}.
                The match starts as soon as they join{level ? ` (level ${level})` : ""}. It works for 1 hour.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 text-left">
              <span className="min-w-0 flex-1 truncate px-2 text-sm">{link}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => copy("link")}>
                {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "link" ? "Copied" : "Copy"}
              </Button>
            </div>
            {code && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 text-left">
                <span className="flex-1 px-2">
                  <span className="block text-xs text-muted-foreground">Code</span>
                  <span className="font-mono text-2xl font-bold tracking-[0.25em]">{code}</span>
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={() => copy("code")}>
                  {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied === "code" ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
            <Button type="button" className="min-h-11 w-full" onClick={shareLink}>
              <Share2 className="size-4" />
              Share link
            </Button>
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              Waiting for your friend to join…
            </p>
            <Button type="button" variant="ghost" onClick={cancel} disabled={isPending}>
              Cancel challenge
            </Button>
          </>
        )}

        {state === "guest" && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">
                {hostName ?? "A player"} challenged you
              </h1>
              <p className="text-sm text-muted-foreground">
                A 10-question match{level ? ` at level ${level}` : ""}. Ready?
              </p>
            </div>
            <Button type="button" className="min-h-11 w-full" onClick={join} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
              Play
            </Button>
          </>
        )}

        {(state === "not_for_you" || state === "closed") && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">
                {state === "not_for_you" ? "This challenge is for someone else" : "Challenge not available"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {state === "not_for_you"
                  ? "It was sent to another player."
                  : "It has already started, was cancelled, or expired."}
              </p>
            </div>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
