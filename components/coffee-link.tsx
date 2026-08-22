"use client";

import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUY_ME_A_COFFEE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CoffeeLinkProps = {
  className?: string;
  showLabel?: boolean;
};

export function CoffeeLink({ className, showLabel = false }: CoffeeLinkProps) {
  return (
    <Button
      asChild
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      className={cn(
        showLabel ? "min-h-10 gap-2 text-muted-foreground" : "size-10 shrink-0",
        className
      )}
    >
      <a
        href={BUY_ME_A_COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy me a coffee"
      >
        <Coffee className="size-4" />
        {showLabel ? "Buy me a coffee" : null}
      </a>
    </Button>
  );
}
