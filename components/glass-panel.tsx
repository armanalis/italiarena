import { cn } from "@/lib/utils";

type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
};

/** Frosted panel — Swiss grid friendly, works in light & dark. */
export function GlassPanel({
  children,
  className,
  as: Tag = "div",
}: GlassPanelProps) {
  return <Tag className={cn("glass-panel", className)}>{children}</Tag>;
}
