import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { allowDevelopmentMocks } from "@/lib/env";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { demoLoginAction } from "@/lib/actions/auth";

export async function MarketingNavbar() {
  const uiLanguage = await getUiLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link className="flex items-center gap-3 text-slate-950" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <span className="text-lg font-semibold tracking-tight">ResumeForge</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
          <Link className="transition-colors hover:text-slate-900" href="/#who-its-for">
            {pickText(uiLanguage, "Who it's for", "适用人群")}
          </Link>
          <Link className="transition-colors hover:text-slate-900" href="/#how-it-works">
            {pickText(uiLanguage, "How it works", "使用流程")}
          </Link>
          <Link className="transition-colors hover:text-slate-900" href="/#capabilities">
            {pickText(uiLanguage, "Capabilities", "产品能力")}
          </Link>
          <Link className="transition-colors hover:text-slate-900" href="/pricing">
            {pickText(uiLanguage, "Pricing", "定价")}
          </Link>
          <Link className="transition-colors hover:text-slate-900" href="/login">
            {pickText(uiLanguage, "Login", "登录")}
          </Link>
          <Link className="rounded-full bg-slate-950 px-4 py-2 font-medium text-white" href="/signup">
            {pickText(uiLanguage, "Start free", "免费开始")}
          </Link>
          <LanguageSwitcher currentLanguage={uiLanguage} />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700"
            href="/login"
          >
            {pickText(uiLanguage, "Login", "登录")}
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white"
            href="/signup"
          >
            {pickText(uiLanguage, "Start", "开始")}
          </Link>
          <LanguageSwitcher currentLanguage={uiLanguage} />
        </div>
        {allowDevelopmentMocks ? (
          <form action={demoLoginAction} className="hidden lg:block">
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              {pickText(uiLanguage, "Demo account", "演示账号")}
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
