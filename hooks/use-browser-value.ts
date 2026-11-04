"use client";

import { useSyncExternalStore } from "react";

// These values change only through the component that reads them, so there is nothing to listen to.
const subscribeToNothing = () => () => {};

/**
 * A value only the browser knows (localStorage, for example), read without a
 * setState-after-mount effect: `serverValue` on the server and while hydrating.
 */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribeToNothing, read, () => serverValue);
}

/** False on the server and while hydrating, true after. */
export function useHydrated(): boolean {
  return useBrowserValue(() => true, false);
}
