"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardNavLinkProps = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  isActive: boolean;
  variant: "sidebar" | "mobile";
};

function NavLinkInner({
  label,
  shortLabel,
  icon: Icon,
  isActive,
  variant,
}: Omit<DashboardNavLinkProps, "href">) {
  const { pending } = useLinkStatus();

  if (variant === "sidebar") {
    return (
      <>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-4" aria-hidden />
        )}
        {label}
      </>
    );
  }

  return (
    <>
      {pending ? (
        <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="size-5 shrink-0" aria-hidden />
      )}
      <span className="max-w-full truncate">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </>
  );
}

export function DashboardNavLink({
  href,
  label,
  shortLabel,
  icon,
  isActive,
  variant,
}: DashboardNavLinkProps) {
  const className =
    variant === "sidebar"
      ? cn(
          "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )
      : cn(
          "touch-target flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors sm:px-2 sm:text-[11px]",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        );

  return (
    <Link href={href} prefetch className={className}>
      <NavLinkInner
        label={label}
        shortLabel={shortLabel}
        icon={icon}
        isActive={isActive}
        variant={variant}
      />
    </Link>
  );
}
