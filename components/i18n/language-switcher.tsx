"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { UI_LANGUAGE_COOKIE } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UILanguage } from "@/lib/types";

export function LanguageSwitcher({
  currentLanguage,
  className,
}: {
  currentLanguage: UILanguage;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingLanguage, setPendingLanguage] = useState<UILanguage | null>(null);
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;

  function applyLanguage(language: UILanguage) {
    if (language === currentLanguage || pendingLanguage !== null) {
      return;
    }

    setPendingLanguage(language);
    document.cookie = `${UI_LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.assign(returnTo);
  }

  return (
    <div className={cn("inline-flex items-center rounded-full border border-slate-200 bg-white p-1", className)}>
      <button
        type="button"
        disabled={pendingLanguage !== null}
        onClick={() => applyLanguage("en")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          pendingLanguage !== null && "opacity-70",
          currentLanguage === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
      >
        EN
      </button>
      <button
        type="button"
        disabled={pendingLanguage !== null}
        onClick={() => applyLanguage("zh")}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          pendingLanguage !== null && "opacity-70",
          currentLanguage === "zh"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
      >
        中文
      </button>
    </div>
  );
}
