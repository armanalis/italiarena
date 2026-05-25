/** Pulse the device when the round timer drops below 5 seconds. */
import { isHapticsEnabled } from "@/lib/preferences";

export function pulseCountdownHaptic() {
  if (!isHapticsEnabled()) {
    return;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([100]);
  }
}
