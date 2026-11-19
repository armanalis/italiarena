import { useEffect } from "react";
import { navigateTo } from "@/lib/client-navigation";

/** Navigate after a server action returns `redirectTo` (useActionState-safe). */
export function useActionRedirect(redirectTo: string | null | undefined) {
  useEffect(() => {
    if (redirectTo) {
      navigateTo(redirectTo);
    }
  }, [redirectTo]);
}
