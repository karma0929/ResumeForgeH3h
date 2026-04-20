import { ArrowUpRight, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { BillingActionButton } from "@/components/billing/billing-action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSessionIdentity } from "@/lib/auth";
import {
  BILLING_PLANS,
  getPlanDefinition,
  isBillingFeature,
  type BillingFeature,
} from "@/lib/billing/plans";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getAppSnapshot } from "@/lib/data";
import { allowDevelopmentMocks } from "@/lib/env";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { isUsageAction, type UsageAction } from "@/lib/usage";
import { formatCurrency, formatDate } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const currentPlan = snapshot.subscription?.plan ?? "FREE";
  const upgradeFeatureParam = queryValue(params, "upgradeFeature");
  const usageLimitParam = queryValue(params, "usageLimit");
  const upgradeFeature: BillingFeature | null = isBillingFeature(upgradeFeatureParam)
    ? upgradeFeatureParam
    : null;
  const usageLimit: UsageAction | null = isUsageAction(usageLimitParam) ? usageLimitParam : null;
  const blocked = queryValue(params, "blocked");
  const checkout = queryValue(params, "checkout");
  const portal = queryValue(params, "portal");
  const targetPlan = queryValue(params, "targetPlan");
  const error = queryValue(params, "error");
  const canUsePortal = hasFeatureAccess(snapshot.subscription?.plan, "customer_portal");

  return (
    <div className="space-y-8">
      <DashboardHeader
        description={pickText(
          uiLanguage,
          "Manage plan changes, review payment history, and control your Stripe-backed subscription workflow.",
          "管理订阅方案、查看支付记录，并控制 Stripe 计费流程。",
        )}
        title={pickText(uiLanguage, "Billing", "账单")}
      />

      {blocked && upgradeFeature ? (
        <StatusBanner
          description={t("That action is available on a higher plan. Upgrade below to unlock it.", "该操作仅在更高套餐可用，请升级后解锁。")}
          title={t("Upgrade required", "需要升级")}
          tone="warning"
        />
      ) : null}

      {checkout === "success" ? (
        <StatusBanner
          description={t(
            "Checkout returned successfully. In Stripe mode, webhook syncing is the source of truth and the subscription will update as events arrive.",
            "结账已成功返回。在 Stripe 模式下，Webhook 同步是唯一数据源，订阅状态会随事件更新。",
          )}
          title={t("Checkout completed", "结账完成")}
          tone="success"
        />
      ) : null}

      {allowDevelopmentMocks && checkout === "mock" ? (
        <StatusBanner
          description={t(
            "Local development used the billing simulation path and updated subscription state in your local database.",
            "本地开发使用了账单模拟路径，并已更新本地数据库中的订阅状态。",
          )}
          title={t("Local billing simulation completed", "本地账单模拟已完成")}
          tone="info"
        />
      ) : null}

      {checkout === "cancelled" ? (
        <StatusBanner
          description={t("No billing changes were applied.", "未发生账单变更。")}
          title={t("Checkout cancelled", "结账已取消")}
          tone="info"
        />
      ) : null}

      {allowDevelopmentMocks && portal === "mock" ? (
        <StatusBanner
          description={t(
            "Stripe portal is not configured in local mode, so ResumeForge kept you in the in-app billing screen.",
            "本地模式未配置 Stripe Portal，ResumeForge 将你保留在应用内账单页面。",
          )}
          title={t("Local portal simulation", "本地 Portal 模拟")}
          tone="info"
        />
      ) : null}

      {error ? (
        <StatusBanner
          description={error}
          title={t("Billing action unavailable", "账单操作暂不可用")}
          tone="warning"
        />
      ) : null}

      {upgradeFeature ? <UpgradePrompt compact feature={upgradeFeature} /> : null}
      {usageLimit ? <UsageLimitPrompt compact action={usageLimit} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-slate-950 text-white">
          <p className="text-sm text-slate-300">{t("Current subscription", "当前订阅")}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            {getPlanDefinition(currentPlan).name}
          </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-white/10 text-white">{snapshot.subscription?.status ?? "ACTIVE"}</Badge>
              <Badge className="bg-white/10 text-white">
                {snapshot.subscription?.provider === "STRIPE"
                  ? t("Stripe-backed", "Stripe 托管")
                  : allowDevelopmentMocks
                    ? t("Local simulation", "本地模拟")
                    : t("Provider unconfigured", "支付提供商未配置")}
              </Badge>
            </div>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            {getPlanDefinition(currentPlan).description}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("Monthly price", "月费")}</p>
              <p className="mt-3 text-2xl font-semibold">
                {formatCurrency(snapshot.subscription?.priceMonthly ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("Renews on", "续费日期")}</p>
              <p className="mt-3 text-2xl font-semibold">
                {snapshot.subscription?.currentPeriodEnd
                  ? formatDate(snapshot.subscription.currentPeriodEnd)
                  : t("Not set", "未设置")}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-white/8 p-4 text-sm leading-7 text-slate-300">
            {allowDevelopmentMocks
              ? t(
                  "Local development can simulate checkout and portal flows when Stripe keys are not configured.",
                  "在未配置 Stripe 密钥时，本地开发可模拟结账与 Portal 流程。",
                )
              : t(
                  "Production billing requires valid Stripe API keys, webhook secret, and price IDs. Missing configuration blocks billing actions with explicit errors.",
                  "生产账单需要有效的 Stripe API Key、Webhook Secret 和 Price ID。缺失配置会阻止操作并给出明确错误。",
                )}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <BillingActionButton
              className="w-full"
              mode="portal"
              pendingLabel={t("Opening portal...", "正在打开 Portal...")}
              variant={canUsePortal ? "outline" : "secondary"}
            >
              {canUsePortal
                ? t("Open billing portal", "打开账单 Portal")
                : allowDevelopmentMocks
                  ? t("Open local billing view", "打开本地账单视图")
                  : t("Portal unavailable", "Portal 不可用")}
            </BillingActionButton>
            {targetPlan ? (
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-slate-900"
                href={`#plan-${targetPlan.toLowerCase()}`}
              >
                {t("Jump to suggested plan", "跳转到推荐套餐")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("Entitlements", "权限能力")}</p>
              <h2 className="text-xl font-semibold text-slate-950">{t("What your plan unlocks", "当前套餐可用能力")}</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {getPlanDefinition(currentPlan).features.map((feature) => (
              <div key={feature} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {feature}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            {allowDevelopmentMocks
              ? t(
                  "Stripe integration can be validated locally with test keys, or simulated when keys are intentionally absent.",
                  "Stripe 集成可在本地用测试密钥验证，或在刻意缺失密钥时走模拟路径。",
                )
              : t(
                  "Subscription state is synchronized from Stripe webhooks and enforced server-side for plan-gated product features.",
                  "订阅状态由 Stripe Webhook 同步，并在服务端强制执行套餐权限。",
                )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.plan;
          const requiresPortalDowngrade = plan.plan === "FREE" && !allowDevelopmentMocks;

          return (
            <Card key={plan.plan} className={plan.plan === "PRO" ? "border-slate-900" : ""}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{plan.name}</h2>
                  <p className="mt-2 text-sm font-medium text-sky-700">{plan.tagline}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{plan.description}</p>
                </div>
                {isCurrent ? <Badge>Current</Badge> : null}
              </div>
              <p className="mt-8 text-4xl font-semibold text-slate-950">
                {plan.monthlyPrice === 0 ? "$0" : formatCurrency(plan.monthlyPrice)}
              </p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-8" id={`plan-${plan.plan.toLowerCase()}`}>
                {isCurrent ? (
                  <div className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-600">
                    {t("Current plan", "当前套餐")}
                  </div>
                ) : requiresPortalDowngrade ? (
                  <BillingActionButton className="w-full" mode="portal" pendingLabel={t("Opening portal...", "正在打开 Portal...")}>
                    {t("Downgrade in billing portal", "在账单 Portal 中降级")}
                  </BillingActionButton>
                ) : (
                  <BillingActionButton
                    className="w-full"
                    mode="checkout"
                    pendingLabel={plan.plan === "FREE" ? t("Switching...", "切换中...") : t("Starting checkout...", "正在发起结账...")}
                    plan={plan.plan}
                  >
                    {plan.cta}
                  </BillingActionButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Payment history</p>
              <p className="text-lg font-semibold text-slate-950">{t("Recorded transactions", "交易记录")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.payments.length > 0 ? (
              snapshot.payments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.provider} {payment.externalId ? `• ${payment.externalId}` : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge>{payment.status}</Badge>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                description={t(
                  "Payments appear here after Stripe invoices or local simulation events are recorded.",
                  "Stripe 发票或本地模拟事件记录后，会在这里展示支付记录。",
                )}
                icon={CreditCard}
                title={t("No payment events yet", "暂无支付事件")}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("Billing sessions", "账单会话")}</p>
              <p className="text-lg font-semibold text-slate-950">{t("Checkout and portal activity", "结账与 Portal 活动")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.billingSessions.length > 0 ? (
              snapshot.billingSessions.slice(0, 6).map((session) => (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {session.type} • {session.provider}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {session.plan ? `${getPlanDefinition(session.plan).name} ${t("plan", "套餐")}` : t("No plan attached", "未绑定套餐")}
                      </p>
                    </div>
                    <Badge>{session.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{formatDate(session.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                description={t(
                  "Checkout and customer portal sessions are logged here for auditability.",
                  "结账与客户 Portal 会话会记录在这里，便于审计追踪。",
                )}
                icon={ExternalLink}
                title={t("No billing sessions yet", "暂无账单会话")}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
