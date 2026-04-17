import { ArrowUpRight, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { startCheckoutAction, openBillingPortalAction } from "@/lib/actions/billing";
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
        description="Manage plan changes, review payment history, and control your Stripe-backed subscription workflow."
        title="Billing"
      />

      {blocked && upgradeFeature ? (
        <StatusBanner
          description="That action is available on a higher plan. Upgrade below to unlock it."
          title="Upgrade required"
          tone="warning"
        />
      ) : null}

      {checkout === "success" ? (
        <StatusBanner
          description="Checkout returned successfully. In Stripe mode, webhook syncing is the source of truth and the subscription will update as events arrive."
          title="Checkout completed"
          tone="success"
        />
      ) : null}

      {allowDevelopmentMocks && checkout === "mock" ? (
        <StatusBanner
          description="Local development used the billing simulation path and updated subscription state in your local database."
          title="Local billing simulation completed"
          tone="info"
        />
      ) : null}

      {checkout === "cancelled" ? (
        <StatusBanner
          description="No billing changes were applied."
          title="Checkout cancelled"
          tone="info"
        />
      ) : null}

      {allowDevelopmentMocks && portal === "mock" ? (
        <StatusBanner
          description="Stripe portal is not configured in local mode, so ResumeForge kept you in the in-app billing screen."
          title="Local portal simulation"
          tone="info"
        />
      ) : null}

      {error ? (
        <StatusBanner
          description={error}
          title="Billing action unavailable"
          tone="warning"
        />
      ) : null}

      {upgradeFeature ? <UpgradePrompt compact feature={upgradeFeature} /> : null}
      {usageLimit ? <UsageLimitPrompt compact action={usageLimit} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-slate-950 text-white">
          <p className="text-sm text-slate-300">Current subscription</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            {getPlanDefinition(currentPlan).name}
          </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-white/10 text-white">{snapshot.subscription?.status ?? "ACTIVE"}</Badge>
              <Badge className="bg-white/10 text-white">
                {snapshot.subscription?.provider === "STRIPE"
                  ? "Stripe-backed"
                  : allowDevelopmentMocks
                    ? "Local simulation"
                    : "Provider unconfigured"}
              </Badge>
            </div>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            {getPlanDefinition(currentPlan).description}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monthly price</p>
              <p className="mt-3 text-2xl font-semibold">
                {formatCurrency(snapshot.subscription?.priceMonthly ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Renews on</p>
              <p className="mt-3 text-2xl font-semibold">
                {snapshot.subscription?.currentPeriodEnd
                  ? formatDate(snapshot.subscription.currentPeriodEnd)
                  : "Not set"}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-white/8 p-4 text-sm leading-7 text-slate-300">
            {allowDevelopmentMocks
              ? "Local development can simulate checkout and portal flows when Stripe keys are not configured."
              : "Production billing requires valid Stripe API keys, webhook secret, and price IDs. Missing configuration blocks billing actions with explicit errors."}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <form action={openBillingPortalAction}>
              <SubmitButton
                className="w-full"
                pendingLabel="Opening portal..."
                variant={canUsePortal ? "outline" : "secondary"}
              >
                {canUsePortal
                  ? "Open billing portal"
                  : allowDevelopmentMocks
                    ? "Open local billing view"
                    : "Portal unavailable"}
              </SubmitButton>
            </form>
            {targetPlan ? (
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-slate-900"
                href={`#plan-${targetPlan.toLowerCase()}`}
              >
                Jump to suggested plan
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
              <p className="text-sm text-slate-500">Entitlements</p>
              <h2 className="text-xl font-semibold text-slate-950">What your plan unlocks</h2>
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
              ? "Stripe integration can be validated locally with test keys, or simulated when keys are intentionally absent."
              : "Subscription state is synchronized from Stripe webhooks and enforced server-side for plan-gated product features."}
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
                    Current plan
                  </div>
                ) : requiresPortalDowngrade ? (
                  <form action={openBillingPortalAction}>
                    <SubmitButton className="w-full" pendingLabel="Opening portal...">
                      Downgrade in billing portal
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={startCheckoutAction}>
                    <input name="plan" type="hidden" value={plan.plan} />
                    <SubmitButton
                      className="w-full"
                      pendingLabel={plan.plan === "FREE" ? "Switching..." : "Starting checkout..."}
                    >
                      {plan.cta}
                    </SubmitButton>
                  </form>
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
              <p className="text-lg font-semibold text-slate-950">Recorded transactions</p>
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
                description="Payments appear here after Stripe invoices or local simulation events are recorded."
                icon={CreditCard}
                title="No payment events yet"
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
              <p className="text-sm text-slate-500">Billing sessions</p>
              <p className="text-lg font-semibold text-slate-950">Checkout and portal activity</p>
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
                        {session.plan ? `${getPlanDefinition(session.plan).name} plan` : "No plan attached"}
                      </p>
                    </div>
                    <Badge>{session.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{formatDate(session.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                description="Checkout and customer portal sessions are logged here for auditability."
                icon={ExternalLink}
                title="No billing sessions yet"
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
