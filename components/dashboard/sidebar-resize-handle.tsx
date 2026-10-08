"use client";

import { useEffect, useRef, useState } from "react";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
  SIDEBAR_WIDTH_VARIABLE,
  clampSidebarWidth,
} from "@/lib/sidebar-width";
import { cn } from "@/lib/utils";

const KEYBOARD_STEP = 16;

function sidebarElement(handle: HTMLElement | null) {
  const previous = handle?.previousElementSibling;
  return previous instanceof HTMLElement ? previous : null;
}

function applyWidth(width: number) {
  document.documentElement.style.setProperty(SIDEBAR_WIDTH_VARIABLE, `${width}px`);
}

function saveWidth(width: number | null) {
  try {
    if (width === null) {
      localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY);
    } else {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    }
  } catch {
    // Private mode / storage off: the width just isn't remembered.
  }
}

/**
 * Drag (or arrow-key) handle on the right edge of the desktop sidebar. Render
 * it directly after the <aside>. Double-click resets the default width.
 */
export function SidebarResizeHandle() {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const lastWidthRef = useRef<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Read the rendered width (saved or default) for the screen-reader value.
  useEffect(() => {
    const aside = sidebarElement(handleRef.current);
    if (aside) {
      setWidth(Math.round(aside.getBoundingClientRect().width));
    }
  }, []);

  function resizeTo(next: number) {
    const clamped = clampSidebarWidth(next, window.innerWidth);
    applyWidth(clamped);
    lastWidthRef.current = clamped;
    setWidth(clamped);
    return clamped;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    const aside = sidebarElement(handleRef.current);
    if (!aside) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startWidth: aside.getBoundingClientRect().width,
    };
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag) {
      resizeTo(drag.startWidth + event.clientX - drag.startX);
    }
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (lastWidthRef.current !== null) {
      saveWidth(lastWidthRef.current);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current =
      width ?? sidebarElement(handleRef.current)?.getBoundingClientRect().width;
    if (current === undefined) {
      return;
    }

    let next: number | null = null;
    if (event.key === "ArrowLeft") next = current - KEYBOARD_STEP;
    if (event.key === "ArrowRight") next = current + KEYBOARD_STEP;
    if (event.key === "Home") next = SIDEBAR_MIN_WIDTH;
    if (event.key === "End") next = SIDEBAR_MAX_WIDTH;
    if (next === null) {
      return;
    }

    event.preventDefault();
    saveWidth(resizeTo(next));
  }

  function resetWidth() {
    document.documentElement.style.removeProperty(SIDEBAR_WIDTH_VARIABLE);
    saveWidth(null);
    const aside = sidebarElement(handleRef.current);
    setWidth(aside ? Math.round(aside.getBoundingClientRect().width) : null);
  }

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar (left and right arrow keys)"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width ?? undefined}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown}
      onDoubleClick={resetWidth}
      // Zero net width (-mx-1 w-2): straddles the sidebar border without
      // shifting the page. touch-none keeps a pen/touch drag from scrolling.
      // Shown only once hydrated (width measured), so it is never a dead control.
      className={cn(
        "group sticky top-below-header z-50 -mx-1 hidden h-app w-2 shrink-0 cursor-col-resize touch-none select-none outline-none [-webkit-user-select:none]",
        width !== null && "md:block"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors",
          dragging
            ? "bg-primary"
            : "bg-transparent group-hover:bg-primary/50 group-focus-visible:bg-primary"
        )}
      />
    </div>
  );
}
