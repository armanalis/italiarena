"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Gamepad2,
  LogOut,
  Settings,
  Trophy,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { GitHubLink } from "@/components/github-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Play", icon: Gamepad2, exact: true },
  { href: "/dashboard/statistics", label: "Stats", icon: BarChart3, exact: false },
  { href: "/dashboard/leaderboard", label: "Ranks", icon: Trophy, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

type DashboardShellProps = {
  profile: UserProfile;
  children: React.ReactNode;
};

function isImmersiveRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard/match/") ||
    pathname === "/dashboard/matchmaking"
  );
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  if (immersive) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <>
      <aside className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-40 hidden h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] w-64 shrink-0 self-start flex-col overflow-y-auto border-r border-border/60 bg-card/40 backdrop-blur-sm dark:bg-sidebar/80 md:flex">
        <div className="flex items-center justify-between gap-2 px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Gamepad2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Language Quiz</p>
              <p className="text-xs text-muted-foreground">Multiplayer Trivia</p>
            </div>
          </div>
          <ThemeToggle className="size-9 shrink-0" />
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border/60 p-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="truncate text-xs font-medium">
              {profile.display_name || profile.email}
            </p>
            {profile.display_name && (
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            )}
            {profile.target_language && profile.proficiency_level && (
              <p className="text-xs text-muted-foreground">
                {profile.target_language} · {profile.proficiency_level}
              </p>
            )}
          </div>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto touch-scroll pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px]",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
