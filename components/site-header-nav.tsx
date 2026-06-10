"use client";

import Link from "next/link";
import { Languages, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { GitHubLink } from "@/components/github-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundVolumeControl } from "@/components/sound-volume-control";
import { Button } from "@/components/ui/button";

type SiteHeaderNavProps = {
  isAuthenticated: boolean;
  displayName: string | null;
  showDashboard: boolean;
  isAdmin: boolean;
};

export function SiteHeaderNav({
  isAuthenticated,
  displayName,
  showDashboard,
  isAdmin,
}: SiteHeaderNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link href={showDashboard ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Languages className="size-4" />
          </div>
          <span className="truncate text-sm font-semibold sm:inline">Language Quiz</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <GitHubLink />
          <SoundVolumeControl />
          <ThemeToggle className="size-10" />

          {!isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden min-h-10 sm:inline-flex">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="min-h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
              >
                <Link href="/login">
                  <span className="sm:hidden">Join</span>
                  <span className="hidden sm:inline">Sign Up</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              {displayName && (
                <span className="hidden max-w-[140px] truncate text-xs font-medium text-muted-foreground lg:inline">
                  {displayName}
                </span>
              )}
              {showDashboard && (
                <Button asChild variant="ghost" size="sm" className="min-h-10 px-2 sm:px-3">
                  <Link href="/dashboard">
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Home</span>
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="outline" size="sm" className="hidden min-h-10 sm:inline-flex">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm" className="min-h-10 gap-1.5 px-2 sm:px-3">
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
