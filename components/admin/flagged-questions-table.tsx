"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  approveReportedQuestion,
  deleteReportedQuestion,
  dismissReportedQuestion,
  type AdminReviewQuestion,
  type FlaggedQuestionUpdate,
} from "@/app/admin/actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCategoryLabel } from "@/lib/scoring";
import type { CorrectAnswer, ReportIssueType } from "@/types/database.types";

const ISSUE_LABELS: Record<ReportIssueType, string> = {
  typo: "Typo",
  wrong_answer: "Wrong answer",
  unnatural_phrasing: "Unnatural phrasing",
};

type FlaggedQuestionsTableProps = {
  questions: AdminReviewQuestion[];
};

export function FlaggedQuestionsTable({ questions }: FlaggedQuestionsTableProps) {
  const [editingQuestion, setEditingQuestion] = useState<AdminReviewQuestion | null>(
    null
  );
  const [form, setForm] = useState<FlaggedQuestionUpdate | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditDialog(question: AdminReviewQuestion) {
    setEditingQuestion(question);
    setForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
    });
  }

  function closeEditDialog() {
    setEditingQuestion(null);
    setForm(null);
  }

  function handleDismiss(questionId: string) {
    startTransition(async () => {
      const result = await dismissReportedQuestion(questionId);

      if (result.success) {
        toast.success("Reports dismissed. Question restored to the active pool.");
        return;
      }

      toast.error(result.error);
    });
  }

  function handleDelete(questionId: string) {
    startTransition(async () => {
      const result = await deleteReportedQuestion(questionId);

      if (result.success) {
        toast.success("Question permanently deleted.");
        return;
      }

      toast.error(result.error);
    });
  }

  function handleApprove() {
    if (!editingQuestion || !form) {
      return;
    }

    if (
      !form.question_text.trim() ||
      !form.option_a.trim() ||
      !form.option_b.trim() ||
      !form.option_c.trim() ||
      !form.option_d.trim()
    ) {
      toast.error("All fields are required.");
      return;
    }

    startTransition(async () => {
      const result = await approveReportedQuestion(editingQuestion.id, form);

      if (result.success) {
        toast.success("Question updated and returned to the active pool.");
        closeEditDialog();
        return;
      }

      toast.error(result.error);
    });
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
        <p className="text-lg font-medium">No reported questions</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Player reports appear here immediately. Questions are removed from the
          active pool after three unique reports.
        </p>
      </div>
    );
  }

  function renderIssueTypes(issueTypes: ReportIssueType[]) {
    if (issueTypes.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {issueTypes.map((issueType) => (
          <Badge key={issueType} variant="outline" className="text-[10px] uppercase">
            {ISSUE_LABELS[issueType]}
          </Badge>
        ))}
      </div>
    );
  }

  function renderStatusBadge(question: AdminReviewQuestion) {
    if (question.status === "quarantined") {
      return <Badge variant="destructive">Quarantined</Badge>;
    }

    return (
      <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-200">
        Pending review
      </Badge>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-4 md:hidden">
        {questions.map((question) => (
          <article
            key={question.id}
            className="rounded-xl border border-border/60 bg-card/50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {formatCategoryLabel(question.category)}
                </Badge>
                {renderStatusBadge(question)}
              </div>
              <Badge variant="destructive">{question.report_count} reports</Badge>
            </div>
            <p className="mt-3 font-medium leading-snug">{question.question_text}</p>
            {renderIssueTypes(question.issue_types)}
            <p className="mt-2 text-xs text-muted-foreground">
              {question.language} · {question.level} · Correct:{" "}
              {question.correct_answer}
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-center"
                disabled={isPending}
                onClick={() => handleDismiss(question.id)}
              >
                <Undo2 className="size-4" />
                Dismiss Reports
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full justify-center"
                disabled={isPending}
                onClick={() => openEditDialog(question)}
              >
                <Pencil className="size-4" />
                Update &amp; Approve
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full justify-center"
                disabled={isPending}
                onClick={() => handleDelete(question.id)}
              >
                <Trash2 className="size-4" />
                Permanently Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden rounded-xl border border-border/60 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reports</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 font-medium">
                    {question.question_text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Correct: {question.correct_answer} ·{" "}
                    {
                      question[
                        `option_${question.correct_answer.toLowerCase()}` as
                          | "option_a"
                          | "option_b"
                          | "option_c"
                          | "option_d"
                      ]
                    }
                  </p>
                  {renderIssueTypes(question.issue_types)}
                </TableCell>
                <TableCell>{question.language}</TableCell>
                <TableCell>{question.level}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatCategoryLabel(question.category)}
                  </Badge>
                </TableCell>
                <TableCell>{renderStatusBadge(question)}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{question.report_count}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleDismiss(question.id)}
                    >
                      <Undo2 className="size-3.5" />
                      Dismiss
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => openEditDialog(question)}
                    >
                      <Pencil className="size-3.5" />
                      Update &amp; Approve
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(question.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(editingQuestion && form)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto touch-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update &amp; approve question</DialogTitle>
            <DialogDescription>
              Edit the question content, then return it to the active pool with
              reports cleared.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="question_text">Question text</Label>
                <textarea
                  id="question_text"
                  rows={3}
                  value={form.question_text}
                  disabled={isPending}
                  onChange={(event) =>
                    setForm({ ...form, question_text: event.target.value })
                  }
                  className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                    <Label htmlFor={field}>Option {letter}</Label>
                    <Input
                      id={field}
                      value={form[field]}
                      disabled={isPending}
                      onChange={(event) =>
                        setForm({ ...form, [field]: event.target.value })
                      }
                    />
                  </div>
                );
              })}

              <div className="grid gap-2">
                <Label>Correct answer</Label>
                <Select
                  value={form.correct_answer}
                  disabled={isPending}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
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
            <Button type="button" disabled={isPending} onClick={handleApprove}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & return to pool"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
