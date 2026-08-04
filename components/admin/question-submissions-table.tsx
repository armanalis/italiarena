"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  approveQuestionSubmission,
  rejectQuestionSubmission,
  type AdminSubmissionReview,
  type ApproveSubmissionInput,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmissionAiPrecheckPanel } from "@/components/admin/submission-ai-precheck-panel";
import { PROFICIENCY_LEVELS, type ProficiencyLevel } from "@/lib/constants";
import { QUESTION_CATEGORIES } from "@/lib/question-contribution";
import { formatCategoryLabel } from "@/lib/scoring";
import type { CorrectAnswer, QuestionCategory } from "@/types/database.types";

type EditSubmissionForm = {
  level: ProficiencyLevel;
  category: QuestionCategory;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
  reviewer_notes: string;
};

type QuestionSubmissionsTableProps = {
  submissions: AdminSubmissionReview[];
};

export function QuestionSubmissionsTable({
  submissions,
}: QuestionSubmissionsTableProps) {
  const [rejecting, setRejecting] = useState<AdminSubmissionReview | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editing, setEditing] = useState<AdminSubmissionReview | null>(null);
  const [editForm, setEditForm] = useState<EditSubmissionForm | null>(null);
  const [isPending, startTransition] = useTransition();

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
        No community submissions waiting for review.
      </div>
    );
  }

  function openEditDialog(submission: AdminSubmissionReview) {
    setEditing(submission);
    setEditForm({
      level: submission.level as ProficiencyLevel,
      category: submission.category,
      question_text: submission.question_text,
      option_a: submission.option_a,
      option_b: submission.option_b,
      option_c: submission.option_c,
      option_d: submission.option_d,
      correct_answer: submission.correct_answer,
      reviewer_notes: "",
    });
  }

  function closeEditDialog() {
    setEditing(null);
    setEditForm(null);
  }

  function handleApprove(submission: AdminSubmissionReview) {
    startTransition(async () => {
      const result = await approveQuestionSubmission(submission.id);

      if (result.success) {
        toast.success("Question approved and added to the live pool.");
        return;
      }

      toast.error(result.error);
    });
  }

  function handleEditAndApprove() {
    if (!editing || !editForm) {
      return;
    }

    if (
      !editForm.question_text.trim() ||
      !editForm.option_a.trim() ||
      !editForm.option_b.trim() ||
      !editForm.option_c.trim() ||
      !editForm.option_d.trim()
    ) {
      toast.error("All question fields are required.");
      return;
    }

    const overrides: ApproveSubmissionInput = {
      level: editForm.level,
      category: editForm.category,
      question_text: editForm.question_text,
      option_a: editForm.option_a,
      option_b: editForm.option_b,
      option_c: editForm.option_c,
      option_d: editForm.option_d,
      correct_answer: editForm.correct_answer,
      reviewer_notes: editForm.reviewer_notes.trim() || undefined,
    };

    startTransition(async () => {
      const result = await approveQuestionSubmission(editing.id, overrides);

      if (result.success) {
        toast.success("Question edited and approved.");
        closeEditDialog();
        return;
      }

      toast.error(result.error);
    });
  }

  function handleReject() {
    if (!rejecting) {
      return;
    }

    startTransition(async () => {
      const result = await rejectQuestionSubmission(rejecting.id, rejectNotes);

      if (result.success) {
        toast.success("Submission rejected.");
        setRejecting(null);
        setRejectNotes("");
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <>
      <div className="space-y-4">
        {submissions.map((submission) => (
          <article
            key={submission.id}
            className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{submission.level}</Badge>
                  <Badge variant="outline">
                    {formatCategoryLabel(submission.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    by{" "}
                    <span className="font-medium text-foreground">
                      {submission.submitter_label}
                    </span>
                  </span>
                </div>
                <p className="text-base font-medium leading-relaxed">
                  {submission.question_text}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const option =
                  letter === "A"
                    ? submission.option_a
                    : letter === "B"
                      ? submission.option_b
                      : letter === "C"
                        ? submission.option_c
                        : submission.option_d;
                const isCorrect = submission.correct_answer === letter;

                return (
                  <div
                    key={letter}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isCorrect
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-border/60"
                    }`}
                  >
                    <span className="font-semibold text-primary">{letter}.</span>{" "}
                    {option}
                  </div>
                );
              })}
            </div>

            {submission.rationale && (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">Contributor rationale</p>
                <p className="mt-1 text-muted-foreground">{submission.rationale}</p>
              </div>
            )}

            <SubmissionAiPrecheckPanel submission={submission} />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleApprove(submission)}
                className="min-h-10"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Approve
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => openEditDialog(submission)}
                className="min-h-10"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setRejecting(submission);
                  setRejectNotes("");
                }}
                className="min-h-10"
              >
                <X className="size-4" />
                Reject
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={Boolean(editing && editForm)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto touch-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit &amp; approve submission</DialogTitle>
            <DialogDescription>
              Adjust the question, options, level, or category, then approve it
              into the live pool.
              {editing ? (
                <>
                  {" "}
                  Submitted by{" "}
                  <span className="font-medium text-foreground">
                    {editing.submitter_label}
                  </span>
                  .
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Level</Label>
                  <Select
                    value={editForm.level}
                    disabled={isPending}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        level: value as ProficiencyLevel,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select
                    value={editForm.category}
                    disabled={isPending}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        category: value as QuestionCategory,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {formatCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-question-text">Question text</Label>
                <textarea
                  id="edit-question-text"
                  rows={3}
                  value={editForm.question_text}
                  disabled={isPending}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      question_text: event.target.value,
                    })
                  }
                  className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </div>

              {(["A", "B", "C", "D"] as const).map((letter) => {
                const field = `option_${letter.toLowerCase()}` as
                  | "option_a"
                  | "option_b"
                  | "option_c"
                  | "option_d";

                return (
                  <div key={letter} className="grid gap-2">
                    <Label htmlFor={`edit-${field}`}>Option {letter}</Label>
                    <Input
                      id={`edit-${field}`}
                      value={editForm[field]}
                      disabled={isPending}
                      onChange={(event) =>
                        setEditForm({ ...editForm, [field]: event.target.value })
                      }
                    />
                  </div>
                );
              })}

              <div className="grid gap-2">
                <Label>Correct answer</Label>
                <Select
                  value={editForm.correct_answer}
                  disabled={isPending}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      correct_answer: value as CorrectAnswer,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["A", "B", "C", "D"] as const).map((letter) => (
                      <SelectItem key={letter} value={letter}>
                        Option {letter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-reviewer-notes">
                  Reviewer notes{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <textarea
                  id="edit-reviewer-notes"
                  rows={2}
                  value={editForm.reviewer_notes}
                  disabled={isPending}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      reviewer_notes: event.target.value,
                    })
                  }
                  placeholder="Optional note about what you changed"
                  className="min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={closeEditDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleEditAndApprove}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Save &amp; approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              Explain what is wrong — especially level or category mismatch — so
              contributors learn the standard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-notes">Reviewer notes</Label>
            <textarea
              id="reject-notes"
              value={rejectNotes}
              onChange={(event) => setRejectNotes(event.target.value)}
              rows={4}
              placeholder="Example: This is A2 vocabulary, not B2. The subjunctive trigger makes it too advanced for the selected level."
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setRejecting(null);
                setRejectNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || rejectNotes.trim().length < 8}
              onClick={handleReject}
            >
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
