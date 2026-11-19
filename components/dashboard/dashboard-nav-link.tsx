"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  variant: "sidebar" | "mobile";
};

type NavItemContentProps = Omit<DashboardNavLinkProps, "href" | "isActive"> & {
  pending: boolean;
};

function NavItemContent({ label, icon: Icon, variant, pending }: NavItemContentProps) {
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
      <span className="max-w-full truncate">{label}</span>
    </>
  );
}

// useLinkStatus only works inside a Link.
function NavLinkInner(props: Omit<NavItemContentProps, "pending">) {
  const { pending } = useLinkStatus();
  return <NavItemContent {...props} pending={pending} />;
}

function navItemClassName(variant: DashboardNavLinkProps["variant"], isActive: boolean) {
  return variant === "sidebar"
      ? cn(
          "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )
      : cn(
          "touch-target flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-0 py-1.5 text-[10px] font-medium leading-tight tracking-tight transition-colors sm:px-2 sm:text-[11px]",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        );
}

export function DashboardNavLink({
  href,
  label,
  icon,
  isActive,
  variant,
}: DashboardNavLinkProps) {
  return (
    <Link href={href} prefetch className={navItemClassName(variant, isActive)}>
      <NavLinkInner label={label} icon={icon} variant={variant} />
    </Link>
  );
}

/** Looks like a nav link but opens something on this page (e.g. the bot picker). */
export function DashboardNavButton({
  onClick,
  label,
  icon,
  variant,
}: Omit<DashboardNavLinkProps, "href" | "isActive"> & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full", navItemClassName(variant, false))}>
      <NavItemContent label={label} icon={icon} variant={variant} pending={false} />
    </button>
  );
}
