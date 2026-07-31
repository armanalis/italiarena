/**
 * Bulk-audit questions_active with mechanical checks + Groq AI review.
 *
 * Examples:
 *   npx tsx scripts/audit-questions.ts --level A1 --limit 20
 *   npx tsx scripts/audit-questions.ts --level B1 --concurrency 2
 *   npx tsx scripts/audit-questions.ts --all --resume
 *   npx tsx scripts/audit-questions.ts --level A1 --quarantine-fails
 *   npx tsx scripts/audit-questions.ts --mechanical-only --all
 *
 * Writes JSONL + summary under tmp/question-audit/.
 * --quarantine-fails moves final_verdict=fail rows into questions_flagged.
 */
import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import {
  auditQuestion,
  type QuestionAuditResult,
} from "../lib/question-audit";
import { PROFICIENCY_LEVELS, type ProficiencyLevel } from "../lib/constants";
import { normalizeQuestionCategory } from "../lib/match";
import type { Database, QuestionActive } from "../types/database.types";

config({ path: ".env.local" });

type CliOptions = {
  level: ProficiencyLevel | null;
  all: boolean;
  limit: number | null;
  concurrency: number;
  skipAi: boolean;
  resume: boolean;
  quarantineFails: boolean;
  delayMs: number;
};

const OUT_DIR = path.join(process.cwd(), "tmp", "question-audit");

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    level: null,
    all: false,
    limit: null,
    concurrency: 2,
    skipAi: false,
    resume: false,
    quarantineFails: false,
    delayMs: 250,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--all") {
      opts.all = true;
      continue;
    }
    if (arg === "--mechanical-only") {
      opts.skipAi = true;
      continue;
    }
    if (arg === "--resume") {
      opts.resume = true;
      continue;
    }
    if (arg === "--quarantine-fails") {
      opts.quarantineFails = true;
      continue;
    }
    if (arg === "--level" && next) {
      if (!(PROFICIENCY_LEVELS as readonly string[]).includes(next)) {
        throw new Error(
          `Invalid --level ${next}. Expected one of: ${PROFICIENCY_LEVELS.join(", ")}`
        );
      }
      opts.level = next as ProficiencyLevel;
      i += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      opts.limit = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--concurrency" && next) {
      opts.concurrency = Math.max(1, Number(next));
      i += 1;
      continue;
    }
    if (arg === "--delay-ms" && next) {
      opts.delayMs = Math.max(0, Number(next));
      i += 1;
      continue;
    }
  }

  if (!opts.all && !opts.level) {
    throw new Error("Pass --level <CEFR> or --all");
  }

  return opts;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadDoneIds(jsonlPath: string): Promise<Set<string>> {
  try {
    const raw = await readFile(jsonlPath, "utf8");
    const ids = new Set<string>();
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as { id?: string };
        if (row.id) ids.add(row.id);
      } catch {
        // ignore corrupt resume lines
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

async function fetchQuestions(
  supabase: ReturnType<typeof createClient<Database>>,
  level: ProficiencyLevel | null,
  limit: number | null
): Promise<QuestionActive[]> {
  const pageSize = 500;
  const rows: QuestionActive[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("questions_active")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (level) {
      query = query.eq("level", level);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    const batch = (data ?? []) as QuestionActive[];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;

    if (limit && rows.length >= limit) break;
  }

  return limit ? rows.slice(0, limit) : rows;
}

async function quarantineQuestion(
  supabase: ReturnType<typeof createClient<Database>>,
  question: QuestionActive
) {
  const category = normalizeQuestionCategory(question.category);

  const { error: insertError } = await supabase.from("questions_flagged").upsert(
    {
      id: question.id,
      language: question.language,
      level: question.level,
      category,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      random_float: question.random_float,
      report_count: 1,
    },
    { onConflict: "id" }
  );

  if (insertError) {
    throw new Error(
      `Quarantine insert failed for ${question.id}: ${insertError.message}`
    );
  }

  const { error: deleteError } = await supabase
    .from("questions_active")
    .delete()
    .eq("id", question.id);

  if (deleteError) {
    throw new Error(
      `Quarantine delete failed for ${question.id}: ${deleteError.message}`
    );
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  );
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  if (!opts.skipAi && !groqKey) {
    console.error("Missing GROQ_API_KEY in .env.local (or pass --mechanical-only)");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await mkdir(OUT_DIR, { recursive: true });
  const stamp = opts.level ?? "all";
  const jsonlPath = path.join(OUT_DIR, `audit-${stamp}.jsonl`);
  const summaryPath = path.join(OUT_DIR, `audit-${stamp}-summary.json`);

  const doneIds = opts.resume ? await loadDoneIds(jsonlPath) : new Set<string>();
  if (!opts.resume) {
    await writeFile(jsonlPath, "");
  }

  console.log(
    `Fetching questions${opts.level ? ` for ${opts.level}` : " (all levels)"}...`
  );
  const questions = await fetchQuestions(supabase, opts.level, opts.limit);
  const pending = questions.filter((q) => !doneIds.has(q.id));

  console.log(
    `Loaded ${questions.length} questions; ${pending.length} pending` +
      (opts.resume ? ` (${doneIds.size} already audited)` : "")
  );

  const counts = {
    pass: 0,
    review: 0,
    fail: 0,
    ai_error: 0,
    quarantined: 0,
  };

  let completed = 0;

  await mapPool(pending, opts.concurrency, async (question) => {
    const result = await auditQuestion(question, {
      skipAi: opts.skipAi,
      apiKey: groqKey,
    });

    if (result.ai_error) counts.ai_error += 1;
    counts[result.final_verdict] += 1;

    if (opts.quarantineFails && result.final_verdict === "fail") {
      await quarantineQuestion(supabase, question);
      counts.quarantined += 1;
    }

    await appendFile(jsonlPath, `${JSON.stringify(result)}\n`);

    completed += 1;
    if (completed % 10 === 0 || completed === pending.length) {
      console.log(
        `[${completed}/${pending.length}] last=${result.id} verdict=${result.final_verdict}` +
          (result.ai_error ? ` ai_error=${result.ai_error}` : "")
      );
    }

    if (opts.delayMs > 0) {
      await sleep(opts.delayMs);
    }

    return result;
  });

  // Rebuild summary from the full JSONL (includes resumed rows).
  const allResults: QuestionAuditResult[] = [];
  try {
    const raw = await readFile(jsonlPath, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      allResults.push(JSON.parse(line) as QuestionAuditResult);
    }
  } catch {
    // empty
  }

  const summary = {
    level: opts.level,
    generated_at: new Date().toISOString(),
    total: allResults.length,
    pass: allResults.filter((r) => r.final_verdict === "pass").length,
    review: allResults.filter((r) => r.final_verdict === "review").length,
    fail: allResults.filter((r) => r.final_verdict === "fail").length,
    ai_errors: allResults.filter((r) => r.ai_error).length,
    quarantined_this_run: counts.quarantined,
    top_fail_issues: Object.entries(
      allResults
        .filter((r) => r.final_verdict === "fail")
        .flatMap((r) => [
          ...r.mechanical_flags,
          ...(r.ai?.issues ?? []),
        ])
        .reduce<Record<string, number>>((acc, issue) => {
          acc[issue] = (acc[issue] ?? 0) + 1;
          return acc;
        }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
    output: jsonlPath,
  };

  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log("\nDone.");
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    `\nNext: open ${jsonlPath} and filter final_verdict != "pass".` +
      (opts.quarantineFails
        ? " Failed questions were moved to questions_flagged."
        : " Re-run with --quarantine-fails to pull fails out of the live pool.")
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
