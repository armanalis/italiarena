"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/** Sonner toaster loaded client-only to avoid dev webpack chunk errors. */
export function AppToaster(props: ToasterProps) {
  return (
    <SonnerToaster
      richColors
      position="top-center"
      offset={16}
      mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 3.75rem)" }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
