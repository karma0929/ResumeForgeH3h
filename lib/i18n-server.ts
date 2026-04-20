import { cookies } from "next/headers";
import { normalizeUiLanguage, UI_LANGUAGE_COOKIE } from "@/lib/i18n";
import type { UILanguage } from "@/lib/types";

export async function getUiLanguage(): Promise<UILanguage> {
  const cookieStore = await cookies();
  return normalizeUiLanguage(cookieStore.get(UI_LANGUAGE_COOKIE)?.value);
}
