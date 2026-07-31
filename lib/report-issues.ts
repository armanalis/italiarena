import type { ReportIssueType } from "@/types/database.types";

export const REPORT_ISSUE_TYPES: ReportIssueType[] = [
  "typo",
  "wrong_answer",
  "unnatural_phrasing",
  "duplicate_answer",
];

export const REPORT_ISSUE_LABELS: Record<ReportIssueType, string> = {
  typo: "Typo",
  wrong_answer: "Wrong correct answer",
  unnatural_phrasing: "Unnatural phrasing",
  duplicate_answer: "Same answer shown twice",
};

export const REPORT_ISSUE_OPTIONS: {
  value: ReportIssueType;
  label: string;
}[] = REPORT_ISSUE_TYPES.map((value) => ({
  value,
  label: REPORT_ISSUE_LABELS[value],
}));

export function isReportIssueType(value: string): value is ReportIssueType {
  return (REPORT_ISSUE_TYPES as string[]).includes(value);
}
