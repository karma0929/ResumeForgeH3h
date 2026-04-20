"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CreditCard, Settings, Shield, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AppUser, UILanguage } from "@/lib/types";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardTopNavigation({
  user,
  uiLanguage,
}: {
  user: AppUser;
  uiLanguage: UILanguage;
}) {
  const pathname = usePathname();
  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: uiLanguage === "zh" ? "开始" : "Start" },
      { href: "/dashboard/flow/improve", label: uiLanguage === "zh" ? "优化" : "Improve" },
      { href: "/dashboard/flow/build", label: uiLanguage === "zh" ? "创建" : "Build" },
      { href: "/dashboard/analysis", label: uiLanguage === "zh" ? "分析" : "Analysis" },
      { href: "/dashboard/versions", label: uiLanguage === "zh" ? "版本" : "Versions" },
      { href: "/dashboard/billing", label: uiLanguage === "zh" ? "账单" : "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: uiLanguage === "zh" ? "设置" : "Settings", icon: Settings },
    ],
    [uiLanguage],
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link className="mr-1 inline-flex items-center gap-2 text-slate-950" href="/dashboard">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">ResumeForge</p>
            <p className="text-[11px] text-slate-500">
              {uiLanguage === "zh" ? "AI 简历工作区" : "AI Resume Workspace"}
            </p>
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rf-nav-pill text-sm",
                )}
                data-state={active ? "active" : "inactive"}
                href={item.href}
                key={item.href}
              >
                {Icon ? <Icon className="rf-nav-pill-icon" /> : null}
                {item.label}
              </Link>
            );
          })}
          {user.role === "ADMIN" ? (
            <Link
              className={cn(
                "rf-nav-pill ml-1 text-sm",
              )}
              data-state={isActive(pathname, "/admin") ? "active" : "inactive"}
              href="/admin"
            >
              <Shield className="rf-nav-pill-icon" />
              {uiLanguage === "zh" ? "管理" : "Admin"}
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" currentLanguage={uiLanguage} />
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-right text-xs sm:block">
            <p className="font-medium text-slate-900">{user.name}</p>
            <p className="text-slate-500">{user.targetRole || user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
              type="submit"
            >
              {uiLanguage === "zh" ? "退出" : "Log out"}
            </button>
          </form>
        </div>

        <div className="w-full lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitcher className="sm:hidden" currentLanguage={uiLanguage} />
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className="rf-nav-pill rf-nav-pill--compact h-8 text-xs"
                    data-state={active ? "active" : "inactive"}
                    href={item.href}
                    key={`mobile_${item.href}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
