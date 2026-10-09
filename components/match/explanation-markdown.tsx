import Markdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

// The typography plugin isn't installed, so each element the model tends to
// emit gets its styling here. <strong> and <em> already look right by default.
const components: Components = {
  // The model often puts a bold title on its own line with a single newline
  // before the paragraph. Markdown treats that as a space, so pre-line keeps
  // the break instead of running the title into the sentence after it.
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  // Headings would be oversized inside a small dialog; render them as a bold line.
  h1: ({ children }) => <p className="font-semibold">{children}</p>,
  h2: ({ children }) => <p className="font-semibold">{children}</p>,
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  // Never navigate away from a match or practice session.
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
};

export function ExplanationMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Markdown components={components}>{content}</Markdown>
    </div>
  );
}
