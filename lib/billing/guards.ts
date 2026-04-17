import { redirect } from "next/navigation";
import { getPlanDefinition, type BillingFeature } from "@/lib/billing/plans";
import type { AppSnapshot, SubscriptionPlan } from "@/lib/types";

export function getEffectivePlan(plan: SubscriptionPlan | null | undefined): SubscriptionPlan {
  return plan ?? "FREE";
}

export function hasFeatureAccess(
  plan: SubscriptionPlan | null | undefined,
  feature: BillingFeature,
) {
  return getPlanDefinition(getEffectivePlan(plan)).featureAccess[feature];
}

export function getUpgradeTargetPlan(feature: BillingFeature): SubscriptionPlan {
  if (feature === "premium_review") {
    return "PREMIUM_REVIEW";
  }

  return "PRO";
}

export function getUpgradePrompt(feature: BillingFeature) {
  const targetPlan = getUpgradeTargetPlan(feature);

  const messages: Record<
    BillingFeature,
    { title: string; description: string; ctaLabel: string; targetPlan: SubscriptionPlan }
  > = {
    analysis_history: {
      title: "Unlock saved analysis history",
      description: "Upgrade to keep durable analysis snapshots instead of relying on one-off previews.",
      ctaLabel: "Upgrade for analysis history",
      targetPlan,
    },
    tailored_resume: {
      title: "Upgrade to save tailored resumes",
      description: "Free previews help you explore, but saving job-specific resume versions is part of the paid workflow.",
      ctaLabel: "Upgrade to save tailored versions",
      targetPlan,
    },
    version_compare: {
      title: "Compare versions on a paid plan",
      description: "Side-by-side comparisons and export-ready version history are reserved for paid subscribers.",
      ctaLabel: "Upgrade for comparisons",
      targetPlan,
    },
    priority_export: {
      title: "Upgrade for export-ready workflow",
      description: "Export and submission-ready version management is available on paid plans.",
      ctaLabel: "Upgrade for exports",
      targetPlan,
    },
    premium_review: {
      title: "Premium Review unlocks expert-style workflows",
      description: "Move to Premium Review to surface the premium feedback and review queue experience.",
      ctaLabel: "Upgrade to Premium Review",
      targetPlan,
    },
    customer_portal: {
      title: "Manage billing from the portal on paid plans",
      description: "The hosted customer portal is enabled for active paid subscriptions.",
      ctaLabel: "Upgrade for billing portal",
      targetPlan,
    },
  };

  return messages[feature];
}

export function requireFeatureAccess(snapshot: AppSnapshot, feature: BillingFeature) {
  const plan = snapshot.subscription?.plan ?? "FREE";

  if (hasFeatureAccess(plan, feature)) {
    return;
  }

  const upgrade = getUpgradePrompt(feature);
  redirect(
    `/dashboard/billing?upgradeFeature=${feature}&targetPlan=${upgrade.targetPlan}&blocked=1`,
  );
}
