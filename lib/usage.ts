import type { AppSnapshot, SubscriptionPlan, UsageCounterRecord } from "@/lib/types";
import { RateLimitError } from "@/lib/errors";

export type UsageAction = "analysis" | "bullet_rewrite" | "tailored_draft";

export const USAGE_ACTIONS = ["analysis", "bullet_rewrite", "tailored_draft"] as const;

const FREE_LIMITS: Record<UsageAction, number> = {
  analysis: 1,
  bullet_rewrite: 2,
  tailored_draft: 0,
};

export function getUsageLimit(
  plan: SubscriptionPlan | null | undefined,
  action: UsageAction,
): number | null {
  return (plan ?? "FREE") === "FREE" ? FREE_LIMITS[action] : null;
}

export function isUsageAction(value: string | null | undefined): value is UsageAction {
  return Boolean(value && USAGE_ACTIONS.includes(value as UsageAction));
}

export function getUsageCount(usage: UsageCounterRecord, action: UsageAction) {
  if (action === "analysis") {
    return usage.analysesUsed;
  }

  if (action === "bullet_rewrite") {
    return usage.bulletRewritesUsed;
  }

  return usage.tailoredDraftsUsed;
}

export function getUsageRemaining(
  plan: SubscriptionPlan | null | undefined,
  usage: UsageCounterRecord,
  action: UsageAction,
) {
  const limit = getUsageLimit(plan, action);

  if (limit === null) {
    return null;
  }

  return Math.max(limit - getUsageCount(usage, action), 0);
}

export function hasUsageRemaining(snapshot: AppSnapshot, action: UsageAction) {
  const remaining = getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, action);
  return remaining === null || remaining > 0;
}

export function getUsageUpgradePrompt(action: UsageAction) {
  const prompts: Record<
    UsageAction,
    { title: string; description: string; ctaLabel: string; targetPlan: "PRO" }
  > = {
    analysis: {
      title: "Unlock unlimited role analysis",
      description:
        "Free workspaces include one full ATS analysis. Upgrade to Pro to analyze every resume against every U.S. role you target.",
      ctaLabel: "Upgrade for unlimited analyses",
      targetPlan: "PRO",
    },
    bullet_rewrite: {
      title: "Unlock more bullet rewrites",
      description:
        "Free workspaces include two bullet rewrites. Upgrade to Pro to iterate on phrasing, metrics, and JD alignment without limits.",
      ctaLabel: "Upgrade for more rewrites",
      targetPlan: "PRO",
    },
    tailored_draft: {
      title: "Unlock tailored resume generation",
      description:
        "Generating job-specific resume drafts is part of the paid workflow. Upgrade to Pro to produce tailored versions and manage them in one workspace.",
      ctaLabel: "Upgrade to generate tailored resumes",
      targetPlan: "PRO",
    },
  };

  return prompts[action];
}

export function getUsageOverview(snapshot: AppSnapshot) {
  return [
    {
      action: "analysis" as const,
      label: "Role analyses",
      used: snapshot.usage.analysesUsed,
      limit: getUsageLimit(snapshot.subscription?.plan, "analysis"),
      remaining: getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, "analysis"),
    },
    {
      action: "bullet_rewrite" as const,
      label: "Bullet rewrites",
      used: snapshot.usage.bulletRewritesUsed,
      limit: getUsageLimit(snapshot.subscription?.plan, "bullet_rewrite"),
      remaining: getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, "bullet_rewrite"),
    },
  ];
}

function lastActionTimestamp(usage: UsageCounterRecord, action: UsageAction) {
  if (action === "analysis") {
    return usage.lastAnalysisAt;
  }

  if (action === "bullet_rewrite") {
    return usage.lastBulletRewriteAt;
  }

  return usage.lastTailoredDraftAt;
}

export function assertUsageCooldown(
  usage: UsageCounterRecord,
  action: UsageAction,
  windowMs = 3000,
) {
  const lastActionAt = lastActionTimestamp(usage, action);

  if (!lastActionAt) {
    return;
  }

  const elapsed = Date.now() - new Date(lastActionAt).getTime();

  if (elapsed < windowMs) {
    throw new RateLimitError("Please wait a few seconds before trying again.");
  }
}
