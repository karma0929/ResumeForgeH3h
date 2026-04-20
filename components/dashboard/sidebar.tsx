"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, CreditCard, FileText, LayoutDashboard, Settings, Shield, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { AppUser } from "@/lib/types";
import type { UILanguage } from "@/lib/types";
import type { OnboardingProgress } from "@/lib/onboarding";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

function getNavItems(language: UILanguage) {
  return [
    { href: "/dashboard", label: language === "zh" ? "开始" : "Start", icon: LayoutDashboard },
    { href: "/dashboard/flow/improve", label: language === "zh" ? "优化" : "Improve", icon: FileText },
    { href: "/dashboard/flow/build", label: language === "zh" ? "从零创建" : "Build", icon: Compass },
    { href: "/dashboard/billing", label: language === "zh" ? "账单" : "Billing", icon: CreditCard },
    { href: "/dashboard/settings", label: language === "zh" ? "设置" : "Settings", icon: Settings },
  ];
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  user,
  onboarding,
  uiLanguage,
}: {
  user: AppUser;
  onboarding: OnboardingProgress;
  uiLanguage: UILanguage;
}) {
  const pathname = usePathname();
  const navItems = getNavItems(uiLanguage);

  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r lg:bg-slate-50/50">
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:h-screen lg:max-w-xs lg:px-5 lg:py-6">
        <Link className="flex items-center gap-3 text-slate-950" href="/dashboard">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">ResumeForge</p>
            <p className="text-xs text-slate-500">
              {uiLanguage === "zh" ? "AI 简历工作台" : "AI resume workspace"}
            </p>
          </div>
        </Link>

        <LanguageSwitcher currentLanguage={uiLanguage} />

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-600">{user.targetRole}</p>
          <p className="mt-2 text-xs text-slate-500">{user.email}</p>
        </div>

        {!onboarding.isComplete ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {uiLanguage === "zh" ? "引导" : "Setup"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {onboarding.completed}/{onboarding.total}{" "}
                  {uiLanguage === "zh" ? "已完成" : "complete"}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600">{onboarding.percent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-[width]"
                style={{ width: `${onboarding.percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {uiLanguage === "zh"
                ? "完成前四步后，可解锁最快的投递工作流。"
                : "Finish the first four steps to unlock the fastest application workflow."}
            </p>
          </div>
        ) : null}

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.href}
                className={cn(
                  "rf-nav-pill w-full justify-start rounded-2xl px-4 py-3 text-sm",
                )}
                data-state={active ? "active" : "inactive"}
                href={item.href}
              >
                <Icon className="rf-nav-pill-icon h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {user.role === "ADMIN" ? (
            <Link
              aria-current={isActivePath(pathname, "/admin") ? "page" : undefined}
              className={cn(
                "rf-nav-pill w-full justify-start rounded-2xl px-4 py-3 text-sm",
              )}
              data-state={isActivePath(pathname, "/admin") ? "active" : "inactive"}
              href="/admin"
            >
              <Shield className="rf-nav-pill-icon h-4 w-4" />
              {uiLanguage === "zh" ? "管理" : "Admin"}
            </Link>
          ) : null}
        </nav>

        <form action={logoutAction}>
          <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            {uiLanguage === "zh" ? "退出登录" : "Log out"}
          </button>
        </form>
      </div>
    </aside>
  );
}
