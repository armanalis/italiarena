export {};

declare global {
  interface Window {
    /**
     * Microsoft Clarity queue stub, created by the loader snippet before the
     * real tag arrives. `clarity("consent", false)` stops an active recording.
     */
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}
