import { randomInt } from "crypto";

/** Auto-generated display name for guest sessions, e.g. Guest428623827. */
export function generateGuestDisplayName(): string {
  const suffix = randomInt(100_000_000, 1_000_000_000);
  return `Guest${suffix}`;
}
