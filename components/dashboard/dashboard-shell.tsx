"use client";

import { GitHubLink } from "@/components/github-link";
import { DashboardNavLink } from "@/components/dashboard/dashboard-nav-link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Gamepad2,
  History,
  LogOut,
  Settings,
  Trophy,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Play", shortLabel: "Play", icon: Gamepad2, exact: true },
  {
    href: "/dashboard/statistics",
    label: "Stats",
    shortLabel: "Stats",
    icon: BarChart3,
    exact: false,
  },
  {
    href: "/dashboard/recent-matches",
    label: "Recent",
    shortLabel: "Recent",
    icon: History,
    exact: false,
  },
  {
    href: "/dashboard/leaderboard",
    label: "Leaderboard",
    shortLabel: "Board",
    icon: Trophy,
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
    exact: false,
  },
];

type DashboardShellProps = {
  children: React.ReactNode;
};

function isImmersiveRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard/match/") ||
    pathname === "/dashboard/matchmaking"
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
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
      <aside className="glass-sidebar sticky top-below-header z-40 hidden h-app w-64 shrink-0 self-start flex-col overflow-y-auto md:flex lg:w-72">
        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map(({ href, label, icon, exact }) => {
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

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto touch-scroll pb-mobile-nav md:pb-0">
        {children}
      </div>

      <nav
        aria-label="Dashboard"
        className="glass-header fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-2 sm:gap-1 sm:px-2">
          {navItems.map(({ href, label, shortLabel, icon, exact }) => {
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
