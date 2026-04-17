import type { SubscriptionPlan } from "@/lib/types";

export const BILLING_FEATURES = [
  "analysis_history",
  "tailored_resume",
  "version_compare",
  "priority_export",
  "premium_review",
  "customer_portal",
] as const;

export type BillingFeature = (typeof BILLING_FEATURES)[number];

export interface BillingPlanDefinition {
  plan: SubscriptionPlan;
  name: string;
  slug: string;
  monthlyPrice: number;
  tagline: string;
  description: string;
  cta: string;
  badge?: string;
  features: string[];
  limits: {
    resumeWorkspaces: number | "unlimited";
    jobDescriptions: number | "unlimited";
    savedVersions: number | "unlimited";
  };
  featureAccess: Record<BillingFeature, boolean>;
}

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    plan: "FREE",
    name: "Free",
    slug: "free",
    monthlyPrice: 0,
    tagline: "Get your first ATS baseline.",
    description: "Enough to explore ResumeForge before committing to an active job search workflow.",
    cta: "Start free",
    features: [
      "1 resume workspace",
      "1 job description",
      "ATS score preview",
      "Basic bullet rewrites",
    ],
    limits: {
      resumeWorkspaces: 1,
      jobDescriptions: 1,
      savedVersions: 1,
    },
    featureAccess: {
      analysis_history: false,
      tailored_resume: false,
      version_compare: false,
      priority_export: false,
      premium_review: false,
      customer_portal: false,
    },
  },
  {
    plan: "PRO",
    name: "Pro",
    slug: "pro",
    monthlyPrice: 2900,
    tagline: "Built for weekly application volume.",
    description: "For active applicants tailoring resumes across multiple roles and companies every week.",
    cta: "Upgrade to Pro",
    badge: "Popular",
    features: [
      "Unlimited resumes and job descriptions",
      "Tailored resume generation",
      "Version comparisons and exports",
      "Billing portal access",
    ],
    limits: {
      resumeWorkspaces: "unlimited",
      jobDescriptions: "unlimited",
      savedVersions: "unlimited",
    },
    featureAccess: {
      analysis_history: true,
      tailored_resume: true,
      version_compare: true,
      priority_export: true,
      premium_review: false,
      customer_portal: true,
    },
  },
  {
    plan: "PREMIUM_REVIEW",
    name: "Premium Review",
    slug: "premium-review",
    monthlyPrice: 9900,
    tagline: "Add a premium review lane on top of Pro.",
    description: "A higher-touch tier ready for manual review workflows, premium exports, and coaching upsell paths.",
    cta: "Upgrade to Premium Review",
    features: [
      "Everything in Pro",
      "Premium review request lane",
      "Priority export and review prompts",
      "High-touch billing and retention hooks",
    ],
    limits: {
      resumeWorkspaces: "unlimited",
      jobDescriptions: "unlimited",
      savedVersions: "unlimited",
    },
    featureAccess: {
      analysis_history: true,
      tailored_resume: true,
      version_compare: true,
      priority_export: true,
      premium_review: true,
      customer_portal: true,
    },
  },
];

export function getPlanDefinition(plan: SubscriptionPlan | null | undefined) {
  return BILLING_PLANS.find((item) => item.plan === (plan ?? "FREE")) ?? BILLING_PLANS[0];
}

export function isBillingFeature(value: string | null | undefined): value is BillingFeature {
  return Boolean(value && BILLING_FEATURES.includes(value as BillingFeature));
}
