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
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1a2226" />
      <rect x="4.5" y="4.5" width="4.75" height="15" rx="1.25" fill="#009246" />
      <rect x="9.25" y="4.5" width="5.5" height="15" fill="#F4F5F0" />
      <rect x="14.75" y="4.5" width="4.75" height="15" rx="1.25" fill="#CE2B37" />
      <text
        x="12"
        y="14.75"
        textAnchor="middle"
        fontSize="6.25"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fill="#009246"
      >
        It
      </text>
    </svg>
  );
}
