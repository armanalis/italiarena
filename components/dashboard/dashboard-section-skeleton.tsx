import { cn } from "@/lib/utils";

type DashboardSectionSkeletonProps = {
  className?: string;
  cards?: number;
};

/** Placeholder while dashboard sections load their server data. */
export function DashboardSectionSkeleton({
  className,
  cards = 2,
}: DashboardSectionSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-1 animate-pulse flex-col gap-6 p-4 sm:p-8 lg:px-10 xl:px-12",
        className
      )}
    >
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted/70" />
      </div>
      <div
        className={cn(
          "grid gap-4",
          cards > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "max-w-3xl"
        )}
      >
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="h-36 rounded-xl border border-border/40 bg-muted/40 sm:h-44"
          />
        ))}
      </div>
    </div>
  );
}
