"use client";

import Link from "next/link";
import { Languages, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:h-16 lg:px-8 xl:px-10 2xl:px-12">
        <Link
          href={showDashboard ? "/dashboard" : "/"}
          className="flex min-w-0 shrink items-center gap-2.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white lg:size-9">
            <Languages className="size-4 lg:size-[1.125rem]" />
          </div>
          <span className="truncate text-sm font-semibold lg:text-base">
            Language Quiz
          </span>
        </Link>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
          <ThemeToggle className="size-10 lg:size-11" />

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
                <span className="hidden max-w-[10rem] truncate text-xs font-medium text-muted-foreground md:inline lg:max-w-[14rem] lg:text-sm xl:max-w-none">
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
