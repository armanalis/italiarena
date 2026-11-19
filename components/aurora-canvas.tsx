import { cn } from "@/lib/utils";

type AuroraCanvasProps = {
  children: React.ReactNode;
  className?: string;
  /** Lower aurora intensity for dashboard / dense UI */
  subtle?: boolean;
};

/** Page backdrop with theme-aware aurora wash (teal/sage, not purple). */
export function AuroraCanvas({
  children,
  className,
  subtle = false,
}: AuroraCanvasProps) {
  return (
    <div
      className={cn(
        "aurora-page min-h-full w-full",
        subtle && "aurora-page--subtle",
        className
      )}
    >
      {children}
    </div>
  );
}
