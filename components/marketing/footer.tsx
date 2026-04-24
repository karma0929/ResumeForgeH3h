import Link from "next/link";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";

export async function MarketingFooter() {
  const uiLanguage = await getUiLanguage();

  return (
    <footer className="mt-24 border-t border-slate-700/55 bg-slate-950/78 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-12 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-base font-semibold text-slate-100">ResumeForge</p>
          <p className="mt-3 max-w-md leading-7">
            {pickText(
              uiLanguage,
              "Guided AI resume workflow for U.S. job seekers. Build stronger positioning, generate tailored versions, and ship application-ready drafts with confidence.",
              "面向美国求职者的引导式 AI 简历工作流。帮助你建立更强定位、生成定向版本，并以更高信心完成投递。",
            )}
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {pickText(uiLanguage, "Product", "产品")}
          </p>
          <div className="flex flex-col gap-2">
            <Link className="transition-colors hover:text-slate-50" href="/#how-it-works">
              {pickText(uiLanguage, "How it works", "使用流程")}
            </Link>
            <Link className="transition-colors hover:text-slate-50" href="/#capabilities">
              {pickText(uiLanguage, "Capabilities", "产品能力")}
            </Link>
            <Link className="transition-colors hover:text-slate-50" href="/pricing">
              {pickText(uiLanguage, "Pricing", "定价")}
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {pickText(uiLanguage, "Account", "账号")}
          </p>
          <div className="flex flex-col gap-2">
            <Link className="transition-colors hover:text-slate-50" href="/login">
              {pickText(uiLanguage, "Login", "登录")}
            </Link>
            <Link className="transition-colors hover:text-slate-50" href="/signup">
              {pickText(uiLanguage, "Start free", "免费开始")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
