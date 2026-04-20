import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { Card } from "@/components/ui/card";
import { BillingActionButton } from "@/components/billing/billing-action-button";
import { allowDevelopmentMocks } from "@/lib/env";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { formatCurrency } from "@/lib/utils";

export default async function PricingPage() {
  const identity = await getSessionIdentity();
  const snapshot = identity ? await getAppSnapshot(identity) : null;
  const currentPlan = snapshot?.subscription?.plan ?? null;
  const uiLanguage = await getUiLanguage();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
            {pickText(uiLanguage, "Pricing", "定价")}
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950">
            {pickText(uiLanguage, "Plans built for real application volume.", "为真实投递量设计的订阅方案。")}
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            {pickText(
              uiLanguage,
              "Start with the free tier, then upgrade when you need durable tailoring, version comparison, and export-ready workflows for an active U.S. job search.",
              "可先使用免费版；当你需要稳定定向优化、版本对比与可导出工作流时再升级。",
            )}
          </p>
        </div>

        <Card className="bg-slate-950 text-white">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {pickText(uiLanguage, "Stripe-ready from the start", "从一开始就支持 Stripe")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {pickText(
                  uiLanguage,
                  "ResumeForge supports Stripe Checkout, customer portal sessions, webhook-backed subscription sync, and server-side feature enforcement.",
                  "ResumeForge 已接入 Stripe Checkout、客户门户、Webhook 订阅同步与服务端权限控制。",
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.plan;
          const isFree = plan.plan === "FREE";
          const requiresPortalDowngrade = snapshot && !isCurrent && isFree && !allowDevelopmentMocks;

          return (
            <Card
              key={plan.plan}
              className={plan.plan === "PRO" ? "border-slate-900 shadow-lg shadow-slate-200/70" : ""}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{plan.name}</h2>
                  <p className="mt-2 text-sm font-medium text-sky-700">{plan.tagline}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{plan.description}</p>
                </div>
                {plan.badge ? (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-8 flex items-end gap-2">
                <p className="text-4xl font-semibold text-slate-950">
                  {plan.monthlyPrice === 0 ? "$0" : formatCurrency(plan.monthlyPrice)}
                </p>
                <p className="pb-1 text-sm text-slate-500">/ month</p>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {plan.limits.resumeWorkspaces} resume workspace{plan.limits.resumeWorkspaces === 1 ? "" : "s"} •{" "}
                {plan.limits.jobDescriptions} job description{plan.limits.jobDescriptions === 1 ? "" : "s"}
              </div>
              <div className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-3 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                {snapshot ? (
                  isCurrent ? (
                    <div className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-600">
                      {pickText(uiLanguage, "Current plan", "当前方案")}
                    </div>
                  ) : requiresPortalDowngrade ? (
                    <Link
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                      href="/dashboard/billing"
                    >
                      {pickText(uiLanguage, "Manage downgrade in billing", "在账单页管理降级")}
                    </Link>
                  ) : (
                    <BillingActionButton className="w-full" mode="checkout" plan={plan.plan}>
                      {isFree ? pickText(uiLanguage, "Switch to Free", "切换到免费版") : plan.cta}
                    </BillingActionButton>
                  )
                ) : (
                  <Link
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                    href="/signup"
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-12 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Plan comparison</p>
              <h2 className="text-xl font-semibold text-slate-950">
                {pickText(uiLanguage, "What unlocks as you upgrade", "升级后可解锁的能力")}
              </h2>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Capability</th>
                {BILLING_PLANS.map((plan) => (
                  <th key={plan.plan} className="px-6 py-4 font-medium">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Saved analysis history", "analysis_history"],
                ["Tailored resume saving", "tailored_resume"],
                ["Version comparison", "version_compare"],
                ["Export-ready workflow", "priority_export"],
                ["Premium review lane", "premium_review"],
              ].map(([label, key]) => (
                <tr key={label} className="border-t border-slate-200">
                  <td className="px-6 py-4 font-medium text-slate-900">{label}</td>
                  {BILLING_PLANS.map((plan) => (
                    <td key={plan.plan} className="px-6 py-4 text-slate-600">
                      {plan.featureAccess[key as keyof typeof plan.featureAccess] ? "Included" : "Not included"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
