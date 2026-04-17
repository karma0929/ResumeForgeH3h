import type {
  AIGenerationRecord,
  AppSnapshot,
  AppUser,
  BillingSessionRecord,
  JobDescriptionRecord,
  PaymentRecord,
  ResumeRecord,
  ResumeVersionRecord,
  SubscriptionRecord,
  UsageCounterRecord,
} from "@/lib/types";
import type { SessionIdentity } from "@/lib/auth";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";
import { generateTailoredResume } from "@/lib/services/generate-tailored-resume";
import { parseResume } from "@/lib/services/resume-parser";
import { rewriteBullet } from "@/lib/services/rewrite-bullet";
import { scoreResume } from "@/lib/services/score-resume";

const createdAt = "2026-04-10T18:00:00.000Z";
const updatedAt = "2026-04-16T17:00:00.000Z";

const resumeText = `Aarav Patel
Seattle, WA | aarav.patel@email.com | linkedin.com/in/aaravpatel

SUMMARY
Early-career software engineer with experience building internal tools, product features, and automation for student and startup teams.

EXPERIENCE
University IT Help Desk | Student Developer | Seattle, WA | 2024 - Present
- Built an internal dashboard that helped advisors track lab usage and student requests.
- Automated ticket triage using Python scripts so the support team could respond faster.
- Partnered with student leaders to launch a self-service FAQ and reduce repeated questions.

PROJECTS
CampusConnect
- Developed a full-stack campus events platform using React, TypeScript, and PostgreSQL.
- Created onboarding flows that improved student activation during the first week on the platform.

SKILLS
React, Next.js, TypeScript, PostgreSQL, Prisma, Python, SQL, REST APIs, Git, Analytics

EDUCATION
M.S. Information Systems, University of Washington
B.Tech. Computer Science, Gujarat Technological University`;

const jobDescriptionText = `Ramp is hiring a Software Engineer, Product to build customer-facing experiences that help finance teams move faster.

You will partner closely with product, design, and data teams to ship high-impact features, improve performance, and iterate quickly.

Requirements
- 1+ years of experience shipping product features with React, TypeScript, and APIs.
- Comfort working with PostgreSQL, analytics, experimentation, and cross-functional stakeholders.
- Strong product thinking, communication, and ownership.`;

const parsedResume = parseResume(resumeText);
const jobDescription = analyzeJobDescription(jobDescriptionText);
const resumeAnalysis = scoreResume(parsedResume, jobDescription);
const tailoredOutput = generateTailoredResume(
  resumeText,
  jobDescriptionText,
  "Software Engineer, Product",
  "Ramp",
);
const rewrittenBullet = rewriteBullet(
  parsedResume.experienceBullets[0] ?? "Built an internal dashboard for advisors.",
  "tailored_to_jd",
  jobDescriptionText,
);

const user: AppUser = {
  id: "user_demo",
  email: "demo@resumeforge.dev",
  name: "Aarav Patel",
  headline: "MS student targeting product engineering roles in the U.S.",
  targetRole: "Software Engineer, Product",
  location: "Seattle, WA",
  role: "ADMIN",
  createdAt,
};

const subscription: SubscriptionRecord = {
  id: "sub_demo",
  userId: user.id,
  plan: "PRO",
  status: "ACTIVE",
  provider: "MOCK",
  priceMonthly: 2900,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  cancelAtPeriodEnd: false,
  entitlements: ["analysis_history", "tailored_resume", "version_compare", "priority_export", "customer_portal"],
  currentPeriodEnd: "2026-05-10T18:00:00.000Z",
};

const resume: ResumeRecord = {
  id: "resume_demo",
  userId: user.id,
  title: "Aarav Patel General Resume",
  originalText: resumeText,
  parsed: parsedResume,
  createdAt,
  updatedAt,
};

const jobDescriptionRecord: JobDescriptionRecord = {
  id: "jd_demo",
  userId: user.id,
  company: "Ramp",
  role: "Software Engineer, Product",
  location: "New York, NY",
  description: jobDescriptionText,
  keywords: jobDescription.keywords,
  createdAt,
  updatedAt,
};

const resumeVersions: ResumeVersionRecord[] = [
  {
    id: "version_original",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: null,
    name: "General Resume v1",
    type: "ORIGINAL",
    content: resumeText,
    summary: "Baseline imported resume.",
    score: resumeAnalysis.overall,
    comparisonNotes: [
      "Strong technical baseline for early-career product roles.",
      "Needs more direct alignment to experimentation and performance keywords.",
    ],
    createdAt,
    updatedAt,
  },
  {
    id: "version_tailored",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: jobDescriptionRecord.id,
    name: tailoredOutput.name,
    type: "TAILORED",
    content: tailoredOutput.content,
    summary: tailoredOutput.summary,
    score: tailoredOutput.score,
    comparisonNotes: tailoredOutput.highlights,
    createdAt: "2026-04-15T18:00:00.000Z",
    updatedAt,
  },
  {
    id: "version_leadership",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: jobDescriptionRecord.id,
    name: "Leadership Cut",
    type: "REWRITE",
    content: resumeText.replace(
      parsedResume.experienceBullets[1],
      rewriteBullet(parsedResume.experienceBullets[1], "leadership_focused").after,
    ),
    summary: "Leadership-forward version for cross-functional product teams.",
    score: Math.min(99, resumeAnalysis.overall + 4),
    comparisonNotes: [
      "Increases ownership language across the experience section.",
      "Useful for associate PM-adjacent or customer-facing engineering roles.",
    ],
    createdAt: "2026-04-16T07:15:00.000Z",
    updatedAt,
  },
];

const aiGenerations: AIGenerationRecord[] = [
  {
    id: "gen_analysis",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: jobDescriptionRecord.id,
    resumeVersionId: resumeVersions[1].id,
    type: "ANALYSIS",
    input: {
      resumeId: resume.id,
      jobDescriptionId: jobDescriptionRecord.id,
    },
    output: resumeAnalysis as unknown as Record<string, unknown>,
    createdAt: "2026-04-15T18:00:00.000Z",
  },
  {
    id: "gen_rewrite",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: jobDescriptionRecord.id,
    resumeVersionId: resumeVersions[2].id,
    type: "BULLET_REWRITE",
    input: {
      bullet: parsedResume.experienceBullets[0],
      mode: "tailored_to_jd",
    },
    output: rewrittenBullet as unknown as Record<string, unknown>,
    createdAt: "2026-04-16T07:10:00.000Z",
  },
  {
    id: "gen_tailored",
    userId: user.id,
    resumeId: resume.id,
    jobDescriptionId: jobDescriptionRecord.id,
    resumeVersionId: resumeVersions[1].id,
    type: "TAILORED_RESUME",
    input: {
      resumeId: resume.id,
      jobDescriptionId: jobDescriptionRecord.id,
    },
    output: tailoredOutput as unknown as Record<string, unknown>,
    createdAt: "2026-04-15T18:05:00.000Z",
  },
];

const payments: PaymentRecord[] = [
  {
    id: "pay_demo_1",
    userId: user.id,
    subscriptionId: subscription.id,
    amount: 2900,
    currency: "USD",
    status: "PAID",
    provider: "MOCK",
    externalId: "mock_pro_seed",
    createdAt: "2026-04-10T18:10:00.000Z",
  },
];

const billingSessions: BillingSessionRecord[] = [
  {
    id: "billing_session_seed",
    userId: user.id,
    subscriptionId: subscription.id,
    provider: "MOCK",
    type: "CHECKOUT",
    status: "COMPLETED",
    plan: subscription.plan,
    externalId: "mock_checkout_seed",
    externalCustomerId: null,
    url: "/dashboard/billing?checkout=mock",
    createdAt: "2026-04-10T18:05:00.000Z",
    updatedAt,
  },
];

const usage: UsageCounterRecord = {
  id: "usage_demo",
  userId: user.id,
  analysesUsed: 3,
  bulletRewritesUsed: 5,
  tailoredDraftsUsed: 2,
  lastAnalysisAt: "2026-04-15T18:00:00.000Z",
  lastBulletRewriteAt: "2026-04-16T07:10:00.000Z",
  lastTailoredDraftAt: "2026-04-15T18:05:00.000Z",
  createdAt,
  updatedAt,
};

export const sampleSnapshot: AppSnapshot = {
  user,
  subscription,
  resumes: [resume],
  jobDescriptions: [jobDescriptionRecord],
  resumeVersions,
  aiGenerations,
  payments,
  billingSessions,
  usage,
};

export function getFallbackSnapshot(identity?: SessionIdentity | null): AppSnapshot {
  if (!identity) {
    return sampleSnapshot;
  }

  return {
    ...sampleSnapshot,
    user: {
      ...sampleSnapshot.user,
      email: identity.email,
      name: identity.name,
    },
  };
}
