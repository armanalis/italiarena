"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-browser-value";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9", className)}
        aria-label={t("Toggle theme")}
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-9", className)}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
