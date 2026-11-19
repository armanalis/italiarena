"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinChallengeByCode } from "@/app/(app)/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

type Join = (code: string) => Promise<{ href: string } | { error: string }>;

async function joinArena(code: string) {
  const result = await joinChallengeByCode(code);
  return result.success ? { href: `/match/${result.sessionId}` } : { error: result.error };
}

/** Joins a friend's game by the 6-digit code shown on their lobby: an Arena challenge unless `join` says otherwise. */
export function JoinCodeForm({ className, join = joinArena }: { className?: string; join?: Join }) {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={cn("flex gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await join(code);
          if ("href" in result) {
            // A "wrong code" toast from an earlier try must not cover the game it opens.
            toast.dismiss();
            router.push(result.href);
          } else {
            toast.error(t(result.error));
          }
        });
      }}
    >
      <Input
        aria-label={t("Challenge code")}
        placeholder={t("Code")}
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        className="h-11 min-w-0 flex-1 md:h-9"
      />
      <Button
        type="submit"
        variant="outline"
        className="h-11 md:h-9"
        disabled={isPending || code.length !== 6}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {t("Join")}
      </Button>
    </form>
  );
}
