"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createChallenge } from "@/app/dashboard/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Creates a challenge anyone with the link can join, then opens its page. */
export function ChallengeLinkButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await createChallenge(null);
          if (result.success) {
            router.push(`/dashboard/challenge/${result.sessionId}`);
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
      Challenge a friend with a link
    </Button>
  );
}
