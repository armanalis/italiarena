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
  LogOut,
  Settings,
  Swords,
  Timer,
  Trophy,
} from "lucide-react";
import { ARTICLE_GAME_NAME } from "@/lib/articles";
import type { TargetLanguage } from "@/lib/constants";

const navItems = [
  { href: "/", label: "Arena", shortLabel: "Arena", icon: Swords, exact: true },
  // No page: opens the bot picker.
  {
    href: null,
    label: "Play with bots",
    shortLabel: "Bots",
    icon: Bot,
    exact: false,
  },
  {
    href: "/wordle",
    label: "Wordle",
    shortLabel: "Wordle",
    icon: Grid3x3,
    exact: false,
  },
  {
    href: "/word-wheel",
    label: "Word Wheel",
    shortLabel: "Wheel",
    icon: CircleDashed,
    exact: false,
  },
  {
    // Named after its buttons in the language being played: der·die·das, il·lo·la.
    href: "/articles",
    label: "Articles",
    shortLabel: "Articles",
    icon: Timer,
    exact: false,
  },
  {
    href: "/stats",
    label: "Stats",
    shortLabel: "Stats",
    icon: BarChart3,
    exact: false,
  },
  {
    href: "/recent",
    label: "Recent",
    shortLabel: "Recent",
    icon: History,
    exact: false,
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    shortLabel: "Board",
    icon: Trophy,
    exact: false,
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
    exact: false,
  },
];

type DashboardShellProps = {
  children: React.ReactNode;
  language: TargetLanguage;
};

function isImmersiveRoute(pathname: string) {
  return (
    pathname.startsWith("/match/") ||
    pathname === "/matchmaking"
  );
}

export function DashboardShell({ children, language }: DashboardShellProps) {
  const pathname = usePathname();
  const items = navItems.map((item) =>
    item.href === "/articles" ? { ...item, label: ARTICLE_GAME_NAME[language] } : item
  );
  const [botsOpen, setBotsOpen] = useState(false);
  const immersive = isImmersiveRoute(pathname);

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

      <div className="app-content flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto touch-scroll pb-mobile-nav md:pb-0">
        {children}
      </div>

      <FriendsPanel language={language} />
      <BotPickerDialog open={botsOpen} onOpenChange={setBotsOpen} />

      <nav
        aria-label="Main"
        className="glass-header hide-while-typing fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-9 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          {items.map(({ href, label, shortLabel, icon, exact }) => {
            if (!href) {
              return (
                <DashboardNavButton
                  key={label}
                  label={label}
                  shortLabel={shortLabel}
                  icon={icon}
                  variant="mobile"
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
                shortLabel={shortLabel}
                icon={icon}
                isActive={isActive}
                variant="mobile"
              />
            );
          })}
        </div>
      </nav>
    </>
  );
}
