"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;

  function href(language: UILanguage) {
    return `/api/preferences/lang?value=${language}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className={cn("inline-flex items-center rounded-full border border-slate-200 bg-white p-1", className)}>
      <Link
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          currentLanguage === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
        href={href("en")}
      >
        EN
      </Link>
      <Link
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          currentLanguage === "zh"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
        href={href("zh")}
      >
        中文
      </Link>
    </div>
  );
}
