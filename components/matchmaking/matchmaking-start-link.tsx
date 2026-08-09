"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { armMatchmakingAutosearch } from "@/lib/matchmaking-intent";

type MatchmakingStartLinkProps = ComponentProps<typeof Link>;

/** Dashboard / CTA link that arms auto-search before entering the lobby. */
export function MatchmakingStartLink({
  onClick,
  ...props
}: MatchmakingStartLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        armMatchmakingAutosearch();
        onClick?.(event);
      }}
    />
  );
}
