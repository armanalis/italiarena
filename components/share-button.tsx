"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shares a game result: the phone's share sheet, or on computers a popup to
 * copy it or send it to WhatsApp. `text` is built on click, so it can use
 * window.location.origin.
 */
export function ShareButton({
  text,
  description,
  className,
}: {
  text: () => string;
  description: string;
  className?: string;
}) {
  // The result being shared in the popup (computers), or null when it is closed.
  const [shareText, setShareText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function share() {
    // The link goes inside the text: some share targets drop `text` when a `url` is given.
    const result = text();
    // Phones get their share sheet. Desktop Chrome has navigator.share too, but
    // its macOS sheet can hang on a spinner, so computers get our own popup.
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text: result });
      } catch {
        // Closing the share sheet is not an error.
      }
      return;
    }
    setCopied(false);
    setShareText(result);
  }

  async function copyShareText() {
    if (!shareText) {
      return;
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <>
      <Button type="button" className={className} onClick={() => void share()}>
        <Share2 className="size-4" />
        Share
      </Button>
      <Dialog open={shareText !== null} onOpenChange={(open) => !open && setShareText(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share your result</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 font-sans text-sm leading-relaxed">
            {shareText}
          </pre>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" className="min-h-11" onClick={() => void copyShareText()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
