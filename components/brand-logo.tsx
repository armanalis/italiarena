import { ItalianBrandIcon } from "@/components/italian-brand-icon";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
};

const boxSize = { sm: "size-8 lg:size-9", md: "size-10" };
const iconSize = { sm: "size-7 lg:size-8", md: "size-9" };

export function BrandLogo({
  size = "sm",
  showLabel = true,
  className,
}: BrandLogoProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          boxSize[size]
        )}
      >
        <ItalianBrandIcon className={iconSize[size]} />
      </span>
      {showLabel && (
        <span className="truncate text-sm font-semibold tracking-tight lg:text-base">
          Language Quiz
        </span>
      )}
    </span>
  );
}
