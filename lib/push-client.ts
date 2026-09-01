/** Browser helpers for PushManager subscription (Settings + future chat opt-in). */

const SW_TIMEOUT_MS = 15_000;
const PERMISSION_TIMEOUT_MS = 45_000;
const SUBSCRIBE_TIMEOUT_MS = 20_000;

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (registration.active) {
    return registration;
  }

  const pending = registration.installing ?? registration.waiting;
  if (!pending) {
    return navigator.serviceWorker.ready;
  }

  await new Promise<void>((resolve, reject) => {
    const onStateChange = () => {
      if (pending.state === "activated") {
        pending.removeEventListener("statechange", onStateChange);
        resolve();
        return;
      }
      if (pending.state === "redundant") {
        pending.removeEventListener("statechange", onStateChange);
        reject(new Error("Notification service failed to start. Try again."));
      }
    };

    pending.addEventListener("statechange", onStateChange);
    onStateChange();
  });

  return registration;
}

export async function registerPushServiceWorker() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  return waitForActiveServiceWorker(registration);
}

export async function getExistingPushSubscription() {
  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    SW_TIMEOUT_MS,
    "Notification service is still starting. Wait a moment and try again."
  );
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Push notifications are not configured on this server.");
  }

  if (!isPushSupported()) {
    throw new Error("This browser does not support push notifications.");
  }

  // Ask permission before waiting on the service worker so iOS cannot hang
  // behind a permission sheet that never appears.
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await withTimeout(
      Notification.requestPermission(),
      PERMISSION_TIMEOUT_MS,
      "Notification permission timed out. Close the app and try again."
    );
  }

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted. Enable it in iPhone Settings → Notifications."
    );
  }

  const registration = await withTimeout(
    registerPushServiceWorker(),
    SW_TIMEOUT_MS,
    "Could not start notification service. Force-close the app and open it again from the Home Screen."
  );

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  try {
    return await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }),
      SUBSCRIBE_TIMEOUT_MS,
      "Could not subscribe to notifications. Check iPhone Settings → Notifications for Italiarena."
    );
  } catch (error) {
    // Stale subscription / key mismatch: clear and retry once.
    const stale = await registration.pushManager.getSubscription();
    if (stale) {
      await stale.unsubscribe().catch(() => undefined);
      return withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }),
        SUBSCRIBE_TIMEOUT_MS,
        "Could not subscribe to notifications. Check iPhone Settings → Notifications for Italiarena."
      );
    }
    throw error;
  }
}

export function serializePushSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Push subscription is missing required keys.");
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
