"use client";

import { Component, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type MatchReviewBoundaryProps = {
  children: ReactNode;
};

type MatchReviewBoundaryState = {
  hasError: boolean;
};

/** Keeps the win/loss screen visible if the review panel throws. */
export class MatchReviewBoundary extends Component<
  MatchReviewBoundaryProps,
  MatchReviewBoundaryState
> {
  state: MatchReviewBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MatchReviewBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/50 p-5 text-left">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Match review unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your score was saved, but the question breakdown could not be
                shown. You can still play again from the buttons below.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
