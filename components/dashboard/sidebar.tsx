/** Left sidebar with main navigation and sign-out. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  LogOut,
  Settings,
  Trophy,
} from "lucide-react";
import { ItalianBrandIcon } from "@/components/italian-brand-icon";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Play 1v1", icon: Gamepad2 },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type DashboardSidebarProps = {
  profile: UserProfile;
};

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-card/40 backdrop-blur-sm dark:bg-sidebar/80">
      <div className="flex items-center justify-between gap-2 px-6 py-5">
        <div className="flex items-center gap-2">
          <ItalianBrandIcon className="size-9 shrink-0 rounded-lg" />
          <div>
            <p className="text-sm font-semibold tracking-tight">Language Quiz</p>
            <p className="text-xs text-muted-foreground">Multiplayer Trivia</p>
          </div>
        </div>
        <ThemeToggle className="size-8 shrink-0" />
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
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
          <p className="truncate text-xs font-medium">{profile.email}</p>
          {profile.target_language && profile.proficiency_level && (
            <p className="text-xs text-muted-foreground">
              {profile.target_language} · {profile.proficiency_level}
            </p>
          )}
        </div>
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
  );
}
