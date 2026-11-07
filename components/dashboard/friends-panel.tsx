"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords, UserPlus, Users, X } from "lucide-react";
import { Popover } from "radix-ui";
import { toast } from "sonner";
import { createChallenge } from "@/app/(app)/matchmaking/actions";
import { ChallengeLinkButton } from "@/components/challenge/challenge-link-button";
import { FriendsTodayList } from "@/components/dashboard/friends-today";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TargetLanguage } from "@/lib/constants";
import { loadFriendsToday, type FriendToday } from "@/lib/friends-today";
import { cn } from "@/lib/utils";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
import type { UiLanguage } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/client";

type FriendRow = {
  friend_id: string;
  display_name: string;
  relation: "friend" | "incoming" | "outgoing";
  level: string | null;
  online: boolean;
  challenge_session_id: string | null;
  /** Null when hidden by the friend (Settings) or not a friend yet. */
  last_seen_at?: string | null;
};

/** "5 minutes ago", "3 hours ago", "yesterday", "12 days ago", in the app language ("5 dakika önce"). */
function lastSeenLabel(iso: string, language: UiLanguage) {
  const relativeTime = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const minutes = Math.min(-1, Math.round((Date.parse(iso) - Date.now()) / 60_000));
  if (minutes > -60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relativeTime.format(hours, "hour");
  return relativeTime.format(Math.round(hours / 24), "day");
}

/** Same cadence as the online counts on the Play screen. */
const FRIENDS_REFRESH_MS = 30_000;

const REQUEST_MESSAGES: Record<string, string> = {
  sent: "Friend request sent.",
  accepted: "You are now friends.",
  already_sent: "You already sent this player a request.",
  already_friends: "You are already friends.",
  not_found: "No player with that username.",
  self: "That's your own username.",
  too_many_pending: "You have 20 requests waiting. Cancel some first.",
};

/** Bottom-right friends button and panel (the shell leaves it out of matches and game screens). */
export function FriendsPanel({ language }: { language: TargetLanguage }) {
  const router = useRouter();
  const t = useT();
  const uiLanguage = useUiLanguage();
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [tab, setTab] = useState("friends");
  // Today's scores load when their tab opens, not every minute with the list.
  const [today, setToday] = useState<FriendToday[] | null>(null);
  const loadToday = () => void loadFriendsToday(createClient(), language).then(setToday);
  const [username, setUsername] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    () =>
      createClient()
        .rpc("get_friends")
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setRows(data as FriendRow[]);
          }
        }),
    []
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), FRIENDS_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const friends = rows
    .filter((row) => row.relation === "friend")
    .sort((a, b) => Number(b.online) - Number(a.online) || a.display_name.localeCompare(b.display_name));
  const incoming = rows.filter((row) => row.relation === "incoming");
  const outgoing = rows.filter((row) => row.relation === "outgoing");
  const challenges = friends.filter((row) => row.challenge_session_id);
  const waitingForYou = incoming.length + challenges.length;

  function run(action: () => PromiseLike<unknown>) {
    startTransition(async () => {
      await action();
      await load();
    });
  }

  function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = username.trim();
    if (!name) {
      return;
    }
    run(async () => {
      const { data, error } = await createClient().rpc("send_friend_request", {
        p_display_name: name,
      });
      if (error) {
        toast.error(t(error.message));
        return;
      }
      const message = t(REQUEST_MESSAGES[String(data)] ?? "Done.");
      if (data === "sent" || data === "accepted") {
        toast.success(message);
        setUsername("");
      } else {
        toast.error(message);
      }
    });
  }

  function challenge(friendId: string) {
    startTransition(async () => {
      const result = await createChallenge(friendId);
      if (result.success) {
        router.push(`/challenge/${result.sessionId}`);
      } else {
        toast.error(t(result.error));
      }
    });
  }

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) {
          void load();
          if (tab === "today") loadToday();
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="hide-while-typing fixed right-4 bottom-[calc(var(--app-mobile-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] z-40 min-h-11 gap-2 rounded-full px-4 shadow-md md:bottom-6"
        >
          <Users className="size-4" />
          {t("Friends")}
          {waitingForYou > 0 && (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {waitingForYou}
              <span className="sr-only"> {t("waiting for you")}</span>
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 max-h-[min(70dvh,32rem)] w-[min(22rem,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none"
        >
          <h2 className="sr-only">{t("Friends")}</h2>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value);
              if (value === "today") loadToday();
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="friends">{t("Friends")}</TabsTrigger>
              <TabsTrigger value="today">{t("Today")}</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="pt-2">
              {today ? (
                <FriendsTodayList rows={today} language={language} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
              )}
            </TabsContent>
            <TabsContent value="friends" className="space-y-4 pt-2">
              {challenges.length > 0 && (
                <section className="space-y-2" aria-label={t("Challenges")}>
                  {challenges.map((row) => (
                    <div key={row.friend_id} className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
                      <span className="min-w-0 truncate">
                        {t("{name} challenged you", { name: row.display_name })}
                      </span>
                      <Button asChild size="sm">
                        <Link href={`/challenge/${row.challenge_session_id}`}>{t("Play")}</Link>
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              {incoming.length > 0 && (
                <section className="space-y-2" aria-label={t("Friend requests")}>
                  <h3 className="text-xs font-medium text-muted-foreground">{t("Requests")}</h3>
                  {incoming.map((row) => (
                    <div key={row.friend_id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{row.display_name}</span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending}
                          onClick={() => run(() => createClient().rpc("respond_friend_request", { p_requester: row.friend_id, p_accept: true }))}
                        >
                          {t("Accept")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => run(() => createClient().rpc("respond_friend_request", { p_requester: row.friend_id, p_accept: false }))}
                        >
                          {t("Decline")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              <section className="space-y-1" aria-label={t("Your friends")}>
                {friends.length === 0 ? (
                  <p className="text-muted-foreground">
                    {t("No friends yet. Add one by username, or share a challenge link.")}
                  </p>
                ) : (
                  friends.map((row) =>
                    confirmRemove === row.friend_id ? (
                      <div key={row.friend_id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                        <span className="min-w-0 truncate">{t("Remove {name}?", { name: row.display_name })}</span>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() =>
                              run(async () => {
                                await createClient().rpc("remove_friend", { p_other: row.friend_id });
                                setConfirmRemove(null);
                              })
                            }
                          >
                            {t("Remove")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>
                            {t("Keep")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={row.friend_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", row.online ? "bg-emerald-500" : "border border-muted-foreground/70")}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{row.display_name}</span>
                          <span className="sr-only">{row.online ? t(", online") : t(", offline")}</span>
                          {!row.online && row.last_seen_at && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {t("Last seen {when}", { when: lastSeenLabel(row.last_seen_at, uiLanguage) })}
                            </span>
                          )}
                        </span>
                        {row.level && (
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {row.level}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-11 md:size-7"
                          aria-label={t("Challenge {name}", { name: row.display_name })}
                          title={t("Challenge")}
                          disabled={isPending}
                          onClick={() => challenge(row.friend_id)}
                        >
                          <Swords className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-11 md:size-7"
                          aria-label={t("Remove {name}", { name: row.display_name })}
                          title={t("Remove friend")}
                          onClick={() => setConfirmRemove(row.friend_id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )
                  )
                )}
              </section>

              {outgoing.length > 0 && (
                <section className="space-y-1" aria-label={t("Sent requests")}>
                  <h3 className="text-xs font-medium text-muted-foreground">{t("Sent")}</h3>
                  {outgoing.map((row) => (
                    <div key={row.friend_id} className="flex items-center justify-between gap-2 px-2">
                      <span className="min-w-0 truncate text-muted-foreground">{t("Waiting for {name}", { name: row.display_name })}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => run(() => createClient().rpc("remove_friend", { p_other: row.friend_id }))}
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              <form onSubmit={sendRequest} className="flex gap-2 border-t border-border/60 pt-4">
                <label htmlFor="friend-username" className="sr-only">
                  {t("Friend's username")}
                </label>
                <Input
                  id="friend-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("Add by username")}
                  autoComplete="off"
                  maxLength={24}
                />
                <Button type="submit" disabled={isPending || !username.trim()} aria-label={t("Send friend request")}>
                  <UserPlus className="size-4" />
                </Button>
              </form>

              <ChallengeLinkButton />
            </TabsContent>
          </Tabs>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
