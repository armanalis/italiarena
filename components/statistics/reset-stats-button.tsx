"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/ui-language-provider";
import { resetPlayerStatistics } from "@/app/(app)/stats/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ResetStatsButtonProps = {
  hasStats: boolean;
};

export function ResetStatsButton({ hasStats }: ResetStatsButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetPlayerStatistics();

      if (result.success) {
        toast.success(t("Statistics reset."));
        setOpen(false);
        return;
      }

      toast.error(t(result.error));
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          disabled={!hasStats || isPending}
        >
          <RotateCcw className="size-4" />
          {t("Reset stats")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Reset all statistics?")}</DialogTitle>
          <DialogDescription>
            {t("This clears your wins, losses, accuracy by category, match history, leaderboard standing, and seen-question memory in every language you play. You cannot undo this.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleReset}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("Resetting...")}
              </>
            ) : (
              t("Reset statistics")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
