import { cn } from "@/lib/utils";

type AdminQueueBadgeProps = {
  count: number;
  className?: string;
  /** Screen-reader label describing what is waiting. */
  label?: string;
};

/**
 * Count pill for pending admin work. Renders nothing at zero so the Admin
 * button stays quiet when the queue is empty.
 */
export function AdminQueueBadge({
  count,
  className,
  label = "items waiting for review",
}: AdminQueueBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-lime-400 px-1.5 text-[0.6875rem] font-bold leading-5 text-lime-950 tabular-nums shadow-[0_0_0_2px_var(--background)] ring-1 ring-lime-300/60",
        className
      )}
    >
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">
        {count} {label}
      </span>
    </span>
  );
}
