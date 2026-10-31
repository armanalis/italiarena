import type { NextRequest } from "next/server";
import { openLanguage } from "@/lib/language-link";

export function GET(request: NextRequest) {
  return openLanguage(request, "Italian");
}
