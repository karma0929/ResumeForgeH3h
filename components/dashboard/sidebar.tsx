"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, FileText, LayoutDashboard, Settings, Shield, Sparkles, Wand2 } from "lucide-react";
import type { AppUser } from "@/lib/types";
import type { OnboardingProgress } from "@/lib/onboarding";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload Resume", icon: FileText },
  { href: "/dashboard/analysis", label: "Resume Analysis", icon: BarChart3 },
  { href: "/dashboard/tailoring", label: "Job Tailoring", icon: Wand2 },
  { href: "/dashboard/versions", label: "Resume Versions", icon: Sparkles },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({
  user,
  onboarding,
}: {
  user: AppUser;
  onboarding: OnboardingProgress;
}) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:h-screen lg:max-w-xs lg:px-5 lg:py-6">
      <Link className="flex items-center gap-3 text-slate-950" href="/dashboard">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">ResumeForge</p>
          <p className="text-xs text-slate-500">AI resume workspace</p>
        </div>
      </Link>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
        <p className="text-sm text-slate-600">{user.targetRole}</p>
        <p className="mt-2 text-xs text-slate-500">{user.email}</p>
      </div>

      {!onboarding.isComplete ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Setup</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {onboarding.completed}/{onboarding.total} complete
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
            Finish the first four steps to unlock the fastest application workflow.
          </p>
        </div>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              className={cn(
                "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {user.role === "ADMIN" ? (
          <Link
            className={cn(
              "flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/admin" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
            )}
            href="/admin"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        ) : null}
      </nav>

      <form action={logoutAction}>
        <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          Log out
        </button>
      </form>
      </div>
    </aside>
  );
}
