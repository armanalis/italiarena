"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { rerunSubmissionAiPrecheck } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatAiCategoryMatchLabel,
  formatAiLanguageOkLabel,
  formatAiLevelMatchLabel,
  formatAiRecommendationLabel,
  type SubmissionAiCategoryMatch,
  type SubmissionAiLanguageOk,
  type SubmissionAiLevelMatch,
  type SubmissionAiPrecheck,
  type SubmissionAiRecommendation,
} from "@/lib/submission-ai-precheck";
import type { AdminSubmissionReview } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

function parsePrecheckDetails(
  details: AdminSubmissionReview["ai_precheck_details"]
): SubmissionAiPrecheck | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const record = details as Partial<SubmissionAiPrecheck>;
  if (
    record.recommendation !== "approve" &&
    record.recommendation !== "review_carefully" &&
    record.recommendation !== "likely_reject"
  ) {
    return null;
  }

  const language_ok: SubmissionAiLanguageOk =
    record.language_ok === "yes" ||
    record.language_ok === "no" ||
    record.language_ok === "unclear"
      ? record.language_ok
      : "unclear";

  return {
    recommendation: record.recommendation,
    language_ok,
    level_match: (record.level_match ?? "unclear") as SubmissionAiLevelMatch,
    category_match: (record.category_match ?? "unclear") as SubmissionAiCategoryMatch,
    suggested_level: record.suggested_level ?? null,
    summary: typeof record.summary === "string" ? record.summary : "",
    flags: Array.isArray(record.flags)
      ? record.flags.filter((flag): flag is string => typeof flag === "string")
      : [],
  };
}

function recommendationVariant(
  recommendation: SubmissionAiRecommendation | null
): "default" | "secondary" | "destructive" | "outline" {
  switch (recommendation) {
    case "approve":
      return "secondary";
    case "review_carefully":
      return "outline";
    case "likely_reject":
      return "destructive";
    default:
      return "outline";
  }
}

type SubmissionAiPrecheckPanelProps = {
  submission: AdminSubmissionReview;
};

export function SubmissionAiPrecheckPanel({
  submission,
}: SubmissionAiPrecheckPanelProps) {
  const [isPending, startTransition] = useTransition();
  const status = submission.ai_precheck_status;

  function handleRerun() {
    startTransition(async () => {
      const result = await rerunSubmissionAiPrecheck(submission.id);
      if (result.success) {
        toast.success("AI advisory refreshed.");
        return;
      }
      toast.error(result.error);
    });
  }

  if (status === "pending" || !status) {
    return (
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          AI pre-check running…
        </div>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="size-4 text-muted-foreground" />
            AI pre-check unavailable
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleRerun}
            className="h-8"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Re-run AI
          </Button>
        </div>
        <p className="mt-1 text-muted-foreground">
          {submission.ai_precheck_summary ??
            "Review this submission manually."}
        </p>
      </div>
    );
  }

  const details = parsePrecheckDetails(submission.ai_precheck_details);
  const recommendation = submission.ai_precheck_recommendation;

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border px-3 py-3 text-sm",
        recommendation === "likely_reject"
          ? "border-amber-500/30 bg-amber-500/5"
          : recommendation === "approve"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-border bg-primary/5"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="font-medium text-foreground">AI advisory</span>
        {recommendation && (
          <Badge variant={recommendationVariant(recommendation)}>
            {formatAiRecommendationLabel(recommendation)}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          You make the final decision
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleRerun}
          className="ml-auto h-8"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Re-run AI
        </Button>
      </div>

      <p className="mt-2 text-muted-foreground">
        {submission.ai_precheck_summary}
      </p>

      {details && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p
            className={cn(
              details.language_ok === "no" && "font-medium text-amber-600 dark:text-amber-400"
            )}
          >
            {formatAiLanguageOkLabel(details.language_ok)}
          </p>
          <p>
            {formatAiLevelMatchLabel(
              details.level_match,
              submission.level,
              details.suggested_level
            )}
          </p>
          <p>
            {formatAiCategoryMatchLabel(
              details.category_match,
              submission.category
            )}
          </p>
          {details.flags.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {details.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
