"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitQuestion } from "@/app/dashboard/contribute/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import {
  CATEGORY_GUIDANCE,
  LEVEL_GUIDANCE,
  QUESTION_CATEGORIES,
  type QuestionSubmissionInput,
} from "@/lib/question-contribution";
import { formatCategoryLabel } from "@/lib/scoring";
import type { CorrectAnswer, QuestionCategory } from "@/types/database.types";
import { cn } from "@/lib/utils";

const OPTION_FIELDS = ["option_a", "option_b", "option_c", "option_d"] as const;
const CORRECT_ANSWERS: CorrectAnswer[] = ["A", "B", "C", "D"];

type QuestionSubmissionFormProps = {
  pendingCount: number;
};

export function QuestionSubmissionForm({ pendingCount }: QuestionSubmissionFormProps) {
  const [level, setLevel] = useState<(typeof PROFICIENCY_LEVELS)[number]>("B1");
  const [category, setCategory] =
    useState<QuestionCategory>("vocabulary");
  const [correctAnswer, setCorrectAnswer] = useState<CorrectAnswer>("A");
  const [levelConfirmed, setLevelConfirmed] = useState(false);
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const levelGuide = LEVEL_GUIDANCE[level];
  const categoryGuide = CATEGORY_GUIDANCE[category];

  const levelWarning = useMemo(() => {
    if (level === "B2" || level === "C1") {
      return "Double-check that this is not a beginner question with an advanced label.";
    }
    if (level === "A1" || level === "A2") {
      return "Avoid advanced grammar or rare vocabulary at this level.";
    }
    return null;
  }, [level]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const input: QuestionSubmissionInput = {
      level,
      category,
      question_text: String(formData.get("question_text") ?? ""),
      option_a: String(formData.get("option_a") ?? ""),
      option_b: String(formData.get("option_b") ?? ""),
      option_c: String(formData.get("option_c") ?? ""),
      option_d: String(formData.get("option_d") ?? ""),
      correct_answer: correctAnswer,
      rationale: String(formData.get("rationale") ?? ""),
      level_confirmed: levelConfirmed,
      category_confirmed: categoryConfirmed,
    };

    startTransition(async () => {
      const result = await submitQuestion(input);

      if (result.success) {
        toast.success(
          "Submitted for review. An admin will make the final decision after an AI pre-check."
        );
        form.reset();
        setLevelConfirmed(false);
        setCategoryConfirmed(false);
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-muted-foreground">
        Submissions are reviewed before going live. You have{" "}
        <span className="font-medium text-foreground">{pendingCount}</span> pending
        {pendingCount === 1 ? "" : "s"}.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>CEFR level</Label>
          <Select value={level} onValueChange={(value) => {
            setLevel(value as (typeof PROFICIENCY_LEVELS)[number]);
            setLevelConfirmed(false);
          }}>
            <SelectTrigger className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFICIENCY_LEVELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => {
            setCategory(value as QuestionCategory);
            setCategoryConfirmed(false);
          }}>
            <SelectTrigger className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatCategoryLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
          <h3 className="font-medium text-foreground">Level guide · {level}</h3>
          <p className="mt-2 text-muted-foreground">{levelGuide.summary}</p>
          <p className="mt-3 font-medium text-foreground">Good fit</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {levelGuide.suitable.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-foreground">Too hard for this level</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {levelGuide.too_hard.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {levelWarning && (
            <p className="mt-3 text-amber-400/90">{levelWarning}</p>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
          <h3 className="font-medium text-foreground">
            Category guide · {categoryGuide.title}
          </h3>
          <p className="mt-3 font-medium text-foreground">Must</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {categoryGuide.must.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-foreground">Avoid</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {categoryGuide.avoid.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question_text">Question</Label>
        <textarea
          id="question_text"
          name="question_text"
          required
          rows={3}
          maxLength={280}
          placeholder={
            category === "fill-in-the-blank"
              ? 'Es: "Domani ___ al cinema con i miei amici."'
              : 'Es: "What does venerdì mean?"'
          }
          className={cn(
            "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "dark:bg-white/5 md:text-sm"
          )}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTION_FIELDS.map((field, index) => {
          const letter = CORRECT_ANSWERS[index];
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>Option {letter}</Label>
              <input
                id={field}
                name={field}
                required
                maxLength={120}
                className={cn(
                  "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base shadow-sm",
                  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "dark:bg-white/5 md:text-sm",
                  correctAnswer === letter && "border-emerald-500/50"
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Correct answer</Label>
        <div className="grid grid-cols-4 gap-2">
          {CORRECT_ANSWERS.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setCorrectAnswer(letter)}
              className={cn(
                "touch-target min-h-11 rounded-lg border text-sm font-medium transition-colors",
                correctAnswer === letter
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-border/60 hover:border-emerald-500/30"
              )}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rationale">Why this level and category?</Label>
        <textarea
          id="rationale"
          name="rationale"
          required
          rows={3}
          maxLength={500}
          placeholder="Explain the grammar/vocab point and why it fits this CEFR level."
          className={cn(
            "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-sm",
            "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "dark:bg-white/5 md:text-sm"
          )}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={levelConfirmed}
            onChange={(event) => setLevelConfirmed(event.target.checked)}
            className="mt-1 size-4 rounded border-input"
          />
          <span>
            I confirm this question matches <strong>{level}</strong> difficulty —
            not easier, not harder.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={categoryConfirmed}
            onChange={(event) => setCategoryConfirmed(event.target.checked)}
            className="mt-1 size-4 rounded border-input"
          />
          <span>
            I confirm this is a <strong>{formatCategoryLabel(category)}</strong>{" "}
            question, not another category relabeled.
          </span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={isPending || !levelConfirmed || !categoryConfirmed}
        className="min-h-11 w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="size-4" />
            Submit for review
          </>
        )}
      </Button>
    </form>
  );
}
