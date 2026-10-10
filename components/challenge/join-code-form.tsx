"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { joinChallengeByCode } from "@/app/dashboard/matchmaking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Joins a friend's challenge by the 6-digit code shown on their challenge page. */
export function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await joinChallengeByCode(code);
          if (result.success) {
            router.push(`/dashboard/match/${result.sessionId}`);
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <Input
        aria-label="Challenge code"
        placeholder="Have a code? 6 digits"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        className="min-h-11 flex-1 md:h-11"
      />
      <Button
        type="submit"
        variant="outline"
        className="min-h-11"
        disabled={isPending || code.length !== 6}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Join
      </Button>
    </form>
  );
}
