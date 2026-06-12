"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetPlayerStatistics } from "@/app/dashboard/statistics/actions";
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetPlayerStatistics();

      if (result.success) {
        toast.success("Statistics reset.");
        setOpen(false);
        return;
      }

      toast.error(result.error);
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
          Reset stats
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset all statistics?</DialogTitle>
          <DialogDescription>
            This clears your wins, losses, accuracy by category, match history,
            leaderboard standing, and seen-question memory. You cannot undo this.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
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
                Resetting...
              </>
            ) : (
              "Reset statistics"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
