"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/ui-language-provider";
import { createChallenge } from "@/app/(app)/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Creates a challenge anyone with the link can join, then opens its page. */
export function ChallengeLinkButton({
  className,
  label = "Challenge a friend with a link",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const t = useT();
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
            router.push(`/challenge/${result.sessionId}`);
          } else {
            toast.error(t(result.error));
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
      {t(label)}
    </Button>
  );
}
