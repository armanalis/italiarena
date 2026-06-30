import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Italian tricolor mark — used in header, auth, and sidebar. */
export function ItalianBrandIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0 overflow-hidden", className)}
      {...props}
    >
      <rect x="0" y="0" width="8" height="24" fill="#009246" />
      <rect x="8" y="0" width="8" height="24" fill="#FFFFFF" />
      <rect x="16" y="0" width="8" height="24" fill="#CE2B37" />
    </svg>
  );
}
