"use client";

import { GitHubLink } from "@/components/github-link";
import { CoffeeLink } from "@/components/coffee-link";
import { useState } from "react";
import { BotPickerDialog } from "@/components/dashboard/bot-picker-dialog";
import { DashboardNavButton, DashboardNavLink } from "@/components/dashboard/dashboard-nav-link";
import { FriendsPanel } from "@/components/dashboard/friends-panel";
import { SidebarResizeHandle } from "@/components/dashboard/sidebar-resize-handle";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CircleDashed,
  Grid3x3,
  History,
  House,
  Images,
  LogOut,
  Settings,
  Swords,
  Timer,
  Trophy,
} from "lucide-react";
import { ARTICLE_GAME_NAME } from "@/lib/articles";
import type { TargetLanguage } from "@/lib/constants";

/** Desktop sidebar only: phones play every game from Home. */
const gameItems = [
  { href: "/", label: "Arena", icon: Swords, exact: true },
  // No page: opens the bot picker.
  { href: null, label: "Play with bots", icon: Bot, exact: false },
  { href: "/wordle", label: "Wordle", icon: Grid3x3, exact: false },
  { href: "/word-wheel", label: "Word Wheel", icon: CircleDashed, exact: false },
  // Named after its buttons in the language being played: der·die·das, il·lo·la.
  { href: "/articles", label: "Articles", icon: Timer, exact: false },
  { href: "/picture-duel", label: "Picture Duel", icon: Images, exact: false },
];

const pageItems = [
  { href: "/stats", label: "Stats", icon: BarChart3, exact: false },
  { href: "/recent", label: "Recent", icon: History, exact: false },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: false },
];

/** Phones: Home holds every game, the bar keeps only the pages. */
const mobileItems = [{ href: "/", label: "Home", icon: House }, ...pageItems];

type DashboardShellProps = {
  children: React.ReactNode;
  language: TargetLanguage;
};

/** Game screens: on phones the Friends button would sit on the game, so it shows everywhere else. */
const GAME_ROUTES = ["/wordle", "/word-wheel", "/articles", "/picture-duel"];

function isGameRoute(pathname: string) {
  return GAME_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isImmersiveRoute(pathname: string) {
  return (
    pathname.startsWith("/match/") ||
    pathname === "/matchmaking"
  );
}

export function DashboardShell({ children, language }: DashboardShellProps) {
  const pathname = usePathname();
  const items = [
    ...gameItems.map((item) =>
      item.href === "/articles" ? { ...item, label: ARTICLE_GAME_NAME[language] } : item
    ),
    ...pageItems,
  ];
  const [botsOpen, setBotsOpen] = useState(false);
  const immersive = isImmersiveRoute(pathname);
  const showFriends = !isGameRoute(pathname);

  if (immersive) {
    return (
      <div className="flex h-app min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <>
      <aside className="glass-sidebar dashboard-sidebar sticky top-below-header z-40 hidden h-app shrink-0 self-start flex-col overflow-y-auto md:flex">
        <nav className="flex-1 space-y-1 px-3 py-5">
          {items.map(({ href, label, icon, exact }) => {
            if (!href) {
              return (
                <DashboardNavButton
                  key={label}
                  label={label}
                  icon={icon}
                  variant="sidebar"
                  onClick={() => setBotsOpen(true)}
                />
              );
            }
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <DashboardNavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={isActive}
                variant="sidebar"
              />
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border/60 p-4">
          <CoffeeLink showLabel className="w-full justify-start px-3" />
          <GitHubLink showLabel className="w-full justify-start px-3" />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>
      <SidebarResizeHandle />

      <div
        className={`app-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto touch-scroll md:pb-0 ${
          showFriends ? "pb-mobile-nav-friends" : "pb-mobile-nav"
        }`}
      >
        {children}
      </div>

      {showFriends && <FriendsPanel language={language} />}
      <BotPickerDialog open={botsOpen} onOpenChange={setBotsOpen} />

      <nav
        aria-label="Main"
        className="glass-header hide-while-typing fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
          {mobileItems.map(({ href, label, icon }) => (
            <DashboardNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              // Games open from Home, so Home stays lit while one is being played.
              isActive={href === "/" ? pathname === "/" || isGameRoute(pathname) : pathname.startsWith(href)}
              variant="mobile"
            />
          ))}
        </div>
      </nav>
    </>
  );
}
