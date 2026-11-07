"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RotateCcw, Share2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTargetLanguage, LANGUAGE_META } from "@/lib/constants";
import { estimateClockOffsetMs } from "@/lib/match-sync-client";
import {
  answerDuel,
  cancelDuel,
  clockMs,
  DUEL_CLOCK_MS,
  joinDuel,
  loadDuel,
  LOBBY_MS,
  passDuel,
  rematchDuel,
  timeoutDuel,
  type PictureDuel,
} from "@/lib/picture-duel";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";
import { createClient } from "@/utils/supabase/client";

type Invite = {
  id: string;
  hostName: string;
  language: string;
  level: string;
  topic: string;
  hard: boolean;
  createdAt: string;
};

/** A fallback for missed realtime updates; realtime is the fast path. */
const POLL_MS = 1_500;
/** How often a screen showing a clock at 0 asks the server to end the duel. */
const TIMEOUT_RETRY_MS = 700;
/** A rematch offer counts while renewed this recently. KEEP IN SYNC with the 8 seconds in picture_duel_rematch. */
const REMATCH_FRESH_MS = 8_000;
/** The offering screen renews its offer this often, so it lapses soon after the player leaves. */
const REMATCH_RENEW_MS = 3_000;
/** After the end, how long a screen keeps polling and an unanswered offer keeps renewing. */
const REMATCH_WINDOW_MS = 120_000;

export function PictureDuelRoom({
  me,
  initial,
  invite,
  link,
}: {
  me: string;
  initial: PictureDuel | null;
  invite: Invite | null;
  link: string;
}) {
  const router = useRouter();
  const t = useT();
  const [supabase] = useState(() => createClient());
  const [duel, setDuel] = useState(initial);
  // localClock + offset ≈ the database's clock, which runs the chess clock.
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  // What is typed belongs to one picture: a new picture starts with an empty field.
  const [typed, setTyped] = useState({ at: -1, text: "" });
  // The last answer the server called wrong: the field is red until it changes.
  // article: hard mode, the word was right but its article missing or wrong.
  const [wrong, setWrong] = useState<{ text: string; article: boolean } | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastTimeout = useRef(0);
  // This screen offered or accepted a rematch, so it follows the duel into it.
  const [offered, setOffered] = useState(false);
  // Our offer ran out of the window without an answer.
  const [unanswered, setUnanswered] = useState(false);
  const leaving = useRef(false);

  // Realtime updates and polls race: keep the newest copy.
  const apply = useCallback((next: PictureDuel | null) => {
    if (next) setDuel((old) => (!old || next.rev > old.rev ? next : old));
  }, []);
  const status = duel?.status;
  const id = duel?.id ?? invite?.id;

  useEffect(() => {
    void estimateClockOffsetMs(supabase).then(setOffset);
  }, [supabase]);

  // A lobby, a duel, or a finished duel whose rematch can still start; not an invitation (not ours to read).
  const listening = status === "waiting" || status === "active" || (status === "finished" && !duel?.rematch_id);
  useEffect(() => {
    if (!id || !listening) {
      return;
    }
    const refresh = () => void loadDuel(supabase, id).then(apply);
    const poll = window.setInterval(refresh, POLL_MS);
    // After the end only realtime keeps listening once the rematch window is over.
    const stopPolling = status === "finished" ? window.setTimeout(() => window.clearInterval(poll), REMATCH_WINDOW_MS) : 0;
    const channel = supabase
      .channel(`picture-duel-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "picture_duels", filter: `id=eq.${id}` }, (payload) => {
        const row = payload.new as PictureDuel;
        if (typeof row?.rev === "number" && Array.isArray(row.log)) apply(row);
        else refresh();
      })
      .subscribe();
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stopPolling);
      void supabase.removeChannel(channel);
    };
  }, [apply, id, listening, status, supabase]);

  // The chess clock, or (slower) how fresh a rematch offer still is.
  const offerOpen = status === "finished" && Boolean(duel?.rematch_by) && !duel?.rematch_id;
  useEffect(() => {
    if (status !== "active" && !offerOpen) {
      return;
    }
    const tick = window.setInterval(() => setNow(Date.now()), status === "active" ? 100 : 1_000);
    return () => window.clearInterval(tick);
  }, [offerOpen, status]);

  const serverNow = now + offset;
  const started = Boolean(duel?.turn_started_at && serverNow >= Date.parse(duel.turn_started_at));
  const revealing = Boolean(duel?.reveal_until && serverNow < Date.parse(duel.reveal_until));
  const myTurn = status === "active" && duel?.turn === me;
  const canPlay = myTurn && started && !revealing && !busy;
  const runningOut = Boolean(duel && duel.turn && status === "active" && started && clockMs(duel, duel.turn, serverNow) <= 0);

  // A clock at 0 by this screen's estimate: the server's clock decides.
  useEffect(() => {
    if (!runningOut || !id || now - lastTimeout.current < TIMEOUT_RETRY_MS) {
      return;
    }
    lastTimeout.current = now;
    void timeoutDuel(supabase, id).then((result) => result.ok && apply(result.value));
  }, [apply, id, now, runningOut, supabase]);

  // The field stays focused so the phone keyboard stays up for the whole duel.
  const position = duel?.position ?? -1;
  const text = typed.at === position ? typed.text : "";
  useEffect(() => {
    input.current?.focus();
  }, [position, myTurn]);

  async function send(kind: "answer" | "pass") {
    if (!duel || !canPlay || (kind === "answer" && !text.trim())) {
      return;
    }
    setBusy(true);
    const result = kind === "answer" ? await answerDuel(supabase, duel.id, text) : await passDuel(supabase, duel.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    apply(result.value.duel);
    if (result.value.result === "wrong" || result.value.result === "article") {
      setWrong({ text, article: result.value.result === "article" });
      input.current?.select();
    }
    input.current?.focus();
  }

  const goTo = useCallback(
    (next: string) => {
      if (leaving.current) return;
      leaving.current = true;
      router.push(`/picture-duel/${next}`);
    },
    [router]
  );

  /** Offers a rematch, renews our offer, or says yes to theirs. */
  const rematch = useCallback(async () => {
    if (!id) return;
    const result = await rematchDuel(supabase, id);
    if (!result.ok) {
      setOffered(false);
      toast.error(t(result.error));
    } else if (result.value.id) {
      goTo(result.value.id);
    } else {
      setOffered(true);
    }
  }, [goTo, id, supabase, t]);

  // Our offer stays alive while this screen is open, for the rematch window at most.
  useEffect(() => {
    if (!offered) return;
    const since = Date.now();
    const renew = window.setInterval(() => {
      if (Date.now() - since > REMATCH_WINDOW_MS) {
        setOffered(false);
        setUnanswered(true);
      } else {
        void rematch();
      }
    }, REMATCH_RENEW_MS);
    return () => window.clearInterval(renew);
  }, [offered, rematch]);

  // The other player said yes: their screen started the rematch, ours follows.
  const rematchId = duel?.rematch_id;
  useEffect(() => {
    if (offered && rematchId) goTo(rematchId);
  }, [goTo, offered, rematchId]);

  async function join() {
    if (!invite) return;
    setBusy(true);
    const result = await joinDuel(supabase, invite.id);
    setBusy(false);
    if (result.ok) {
      apply(result.value);
    } else {
      toast.error(t(result.error));
      router.refresh();
    }
  }

  async function shareLink() {
    const shareText = `${t("Picture Duel: name the pictures in {language} before your clock runs out!", {
      language: t(duel?.language ?? "Italian"),
    })}${duel?.code ? ` ${t("Open the link, or enter code {code} on the Picture Duel page:", { code: duel.code })}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("Picture Duel"), text: shareText, url: link });
        return;
      } catch {
        // Closing the share sheet is not an error.
        return;
      }
    }
    await copy("link");
  }

  async function copy(what: "link" | "code") {
    await navigator.clipboard.writeText(what === "code" && duel?.code ? duel.code : link);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2_000);
  }

  // ---- Not a player: the invitation, or nothing to join. ----
  if (!duel) {
    return (
      <Panel>
        {invite && serverNow - Date.parse(invite.createdAt) < LOBBY_MS ? (
          <>
            <Title
              sub={`${t(invite.language)} · ${invite.level} · ${t(invite.topic)} · ${t("60 seconds each")}${invite.hard ? ` · ${t("Hard mode: answers need their article")}` : ""}`}
            >
              {t("{name} challenged you to a Picture Duel", { name: invite.hostName })}
            </Title>
            <p className="text-sm text-muted-foreground">
              {t("Name each picture to stop your clock and start theirs. Pass shows the answer, but your clock keeps running.")}
            </p>
            <Button type="button" className="min-h-11 w-full" onClick={() => void join()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("Play")}
            </Button>
          </>
        ) : (
          <Closed />
        )}
      </Panel>
    );
  }

  const code = isTargetLanguage(duel.language) ? LANGUAGE_META[duel.language].code : undefined;
  const meIsHost = duel.host_id === me;
  const other = { id: meIsHost ? duel.guest_id : duel.host_id, name: (meIsHost ? duel.guest_name : duel.host_name) ?? t("Friend") };
  const nameOf = (player: string) => (player === me ? t("You") : other.name);
  const heading = `${t(duel.language)} · ${duel.level} · ${t(duel.topic)}${duel.hard ? ` · ${t("Hard mode")}` : ""}`;
  const isWrong = text !== "" && text === wrong?.text;

  // ---- The host waits for the friend. ----
  if (status === "waiting") {
    if (serverNow - Date.parse(duel.created_at) >= LOBBY_MS) {
      return (
        <Panel>
          <Closed />
        </Panel>
      );
    }
    return (
      <Panel>
        <Title sub={heading}>{t("Send this link to a friend")}</Title>
        <p className="text-sm text-muted-foreground">
          {duel.code && `${t("Or tell them the code to enter on their Picture Duel page.")} `}
          {t("The duel starts as soon as they press Play. It works for 1 hour.")}
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 text-left">
          <span className="min-w-0 flex-1 truncate px-2 text-sm">{link}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => void copy("link")}>
            {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === "link" ? t("Copied") : t("Copy")}
          </Button>
        </div>
        {duel.code && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 text-left">
            <span className="flex-1 px-2">
              <span className="block text-xs text-muted-foreground">{t("Code")}</span>
              <span className="font-mono text-2xl font-bold tracking-[0.25em]">{duel.code}</span>
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void copy("code")}>
              {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied === "code" ? t("Copied") : t("Copy")}
            </Button>
          </div>
        )}
        <Button type="button" className="min-h-11 w-full" onClick={() => void shareLink()}>
          <Share2 className="size-4" />
          {t("Share link")}
        </Button>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          {t("Waiting for your friend to join…")}
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void cancelDuel(supabase, duel.id).then(() => router.replace("/picture-duel"))}
        >
          {t("Cancel duel")}
        </Button>
      </Panel>
    );
  }

  // ---- The results. ----
  if (status === "finished") {
    const won = duel.winner_id === me;
    const theyOffered =
      !offered &&
      duel.rematch_by === other.id &&
      Boolean(duel.rematch_at && serverNow - Date.parse(duel.rematch_at) < REMATCH_FRESH_MS);
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Panel>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {won ? <Trophy className="size-7" /> : <X className="size-7" />}
          </div>
          <Title sub={heading}>{won ? t("You won!") : t("{name} won", { name: other.name })}</Title>
          <p className="text-sm text-muted-foreground">
            {t("You named {mine} · {name} named {theirs}", {
              mine: meIsHost ? duel.host_score : duel.guest_score,
              name: other.name,
              theirs: meIsHost ? duel.guest_score : duel.host_score,
            })}
          </p>
          <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium">
            {offered
              ? t("Rematch offered. Waiting for {name}…", { name: other.name })
              : theyOffered
                ? t("{name} wants a rematch!", { name: other.name })
                : unanswered
                  ? t("{name} did not answer. Offer again, or start a new duel.", { name: other.name })
                  : null}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={offered || busy}
              onClick={async () => {
                setUnanswered(false);
                setBusy(true);
                await rematch();
                setBusy(false);
              }}
            >
              {offered || busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {theyOffered ? t("Accept rematch") : t("Rematch")}
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/picture-duel">{t("New duel")}</Link>
            </Button>
          </div>
        </Panel>
        {duel.log.length > 0 && (
          <section aria-labelledby="pictures-heading" className="space-y-2">
            <h2 id="pictures-heading" className="text-sm font-semibold">
              {t("The pictures")}
            </h2>
            <ul className="space-y-1.5">
              {duel.log.map((entry, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5 text-sm">
                  <span className="text-2xl leading-none" aria-hidden>
                    {entry.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span lang={code} className="font-semibold">
                      {entry.answer}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.result === "right"
                        ? t("{name} · named it", { name: nameOf(entry.by) })
                        : t("{name} · passed", { name: nameOf(entry.by) })}
                    </span>
                  </span>
                  {isTargetLanguage(duel.language) && (
                    <SpeakButton className="-my-1.5" text={entry.answer} language={duel.language} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ---- The duel. ----
  const last = duel.log.at(-1);
  const countdown = Math.ceil((Date.parse(duel.turn_started_at ?? "") - serverNow) / 1000);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">{heading}</p>

      <div className="grid grid-cols-2 gap-2">
        {[me, other.id!].map((player) => {
          const left = clockMs(duel, player, serverNow);
          const running = duel.turn === player && started;
          return (
            <div
              key={player}
              className="glass-panel space-y-0.5 p-3 text-center"
              // Inline: .glass-panel's box-shadow hides a ring, and cn() (tailwind-merge 3,
              // Tailwind 4 rules) drops Tailwind 3's `outline` next to `outline-2`.
              style={running ? { outline: "2px solid var(--primary)" } : undefined}
            >
              <p className="truncate text-xs font-medium text-muted-foreground">{nameOf(player)}</p>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  left < 10_000 && "text-red-600 dark:text-red-400"
                )}
                aria-label={t("{name}: {n} seconds", { name: nameOf(player), n: Math.ceil(left / 1000) })}
              >
                {Math.ceil(left / 1000)}
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${(left / DUEL_CLOCK_MS) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center" aria-live="polite">
        {!started ? (
          <>
            <p className="text-sm text-muted-foreground">{myTurn ? t("You start") : t("{name} starts", { name: other.name })}</p>
            <p className="text-6xl font-bold tabular-nums">{Math.max(1, countdown)}</p>
          </>
        ) : revealing && last ? (
          <>
            <span className="text-7xl leading-none" aria-hidden>
              {last.emoji}
            </span>
            <p lang={code} className="text-2xl font-bold">
              {last.answer}
            </p>
            <p className="text-xs text-muted-foreground">{t("{name} passed", { name: nameOf(last.by) })}</p>
          </>
        ) : (
          <>
            <span className="text-8xl leading-none" role="img" aria-label={t("Name this picture")}>
              {duel.emoji}
            </span>
            <p className="text-sm font-medium">{myTurn ? t("Your turn: name it!") : t("{name} is answering…", { name: other.name })}</p>
          </>
        )}
      </div>

      {/* Above the answer box: on phones the keyboard covers whatever is below it. */}
      <p className="min-h-5 text-center text-sm text-muted-foreground" role="status">
        {isWrong ? (
          <span className="font-medium text-red-600 dark:text-red-400">
            {wrong?.article ? t("Right word, but the article is missing or wrong") : t("Not quite: try again or pass")}
          </span>
        ) : last && !revealing && (
          <>
            {last.emoji} <span lang={code} className="font-medium text-foreground">{last.answer}</span> ·{" "}
            {last.result === "right" ? t("{name} named it", { name: nameOf(last.by) }) : t("{name} passed", { name: nameOf(last.by) })}
          </>
        )}
      </p>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send("answer");
        }}
      >
        <Input
          ref={input}
          value={text}
          onChange={(event) => setTyped({ at: position, text: event.target.value })}
          aria-invalid={isWrong}
          lang={code}
          maxLength={60}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          aria-label={t("Your answer")}
          placeholder={myTurn ? (duel.hard ? t("Type it in {language}, with its article…", { language: t(duel.language) }) : t("Type it in {language}…", { language: t(duel.language) })) : t("Wait for your turn")}
          className="h-12 flex-1 text-base md:h-12 md:text-base"
        />
        <Button type="button" variant="outline" className="h-12" disabled={!canPlay} onClick={() => void send("pass")}>
          {t("Pass")}
        </Button>
      </form>

    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="glass-panel mx-auto w-full max-w-md space-y-5 p-6 text-center sm:p-8">{children}</div>;
}

function Title({ children, sub }: { children: React.ReactNode; sub: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold tracking-tight">{children}</h1>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Closed() {
  const t = useT();
  return (
    <>
      <Title sub={t("It has already started, was cancelled, or expired.")}>{t("This duel is not available")}</Title>
      <Button asChild variant="outline" className="min-h-11 w-full">
        <Link href="/picture-duel">{t("Start your own")}</Link>
      </Button>
    </>
  );
}
