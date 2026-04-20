import type { UILanguage } from "@/lib/types";

export const UI_LANGUAGE_COOKIE = "rf-ui-lang";

export function normalizeUiLanguage(value: string | null | undefined): UILanguage {
  return value === "zh" ? "zh" : "en";
}

export function pickText(language: UILanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

export function isInternalPath(input: string | null | undefined) {
  if (!input) {
    return false;
  }
  return input.startsWith("/") && !input.startsWith("//");
}
