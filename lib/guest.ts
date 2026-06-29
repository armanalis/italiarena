import { randomUUID } from "crypto";

const GUEST_PREFIX = "Guest";
const GUEST_SUFFIX_LENGTH = 12;

/** Unique guest label tied to an auth user id, e.g. Guesta1b2c3d4e5f6. */
export function generateGuestDisplayName(seed?: string): string {
  const source = (seed ?? randomUUID()).replace(/-/g, "").toLowerCase();
  return `${GUEST_PREFIX}${source.slice(0, GUEST_SUFFIX_LENGTH)}`;
}

export { isGuestAuthEmail, isGuestAuthUser } from "@/lib/guest-auth";
