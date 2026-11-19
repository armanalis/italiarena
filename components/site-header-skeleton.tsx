/** Lightweight header placeholder while auth state loads. */
export function SiteHeaderSkeleton() {
  return (
    <header className="glass-header sticky top-0 z-50 w-full shrink-0 pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-[var(--app-header-height)] w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted lg:size-9" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="flex items-center gap-2">
          <div className="size-10 animate-pulse rounded-md bg-muted/60" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted/60" />
        </div>
      </div>
    </header>
  );
}
