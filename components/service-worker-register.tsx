"use client";

import { useEffect } from "react";

/**
 * Registers the push service worker as soon as the app loads.
 *
 * Registration used to happen inside the notification toggle, which meant the
 * worker was installed, activated, and subscribed to inside a single user
 * gesture. On iOS that race is the common cause of "Could not start
 * notification service" — by the time the worker is ready the gesture has
 * expired. Registering here means the worker is already active before anyone
 * opts in, so subscribing is just one quick call.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    function register() {
      if (cancelled) return;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Private browsing or an unsupported context. Opting in to
          // notifications registers again and surfaces the real error there.
        });
    }

    // Wait for load so the worker does not compete with first-paint resources.
    if (document.readyState === "complete") {
      register();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
