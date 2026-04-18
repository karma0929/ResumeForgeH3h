import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";
import { generateTailoredResume } from "@/lib/services/generate-tailored-resume";
import { parseResume } from "@/lib/services/resume-parser";
import { rewriteBullet } from "@/lib/services/rewrite-bullet";
import { scoreResume } from "@/lib/services/score-resume";
import type { TargetRoleBriefData } from "@/lib/types";
import {
  calculateResumeProfileCompleteness,
  calculateTargetRoleBriefCompleteness,
  createDefaultResumeProfileData,
  createDefaultTargetRoleBriefData,
  splitCsv,
} from "@/lib/workshop";

const prisma = new PrismaClient();

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

function inferAppEnv() {
  const explicit = process.env.APP_ENV;

  if (explicit === "local" || explicit === "preview" || explicit === "production") {
    return explicit;
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "local";
}

function assertSeedAllowed() {
  const appEnv = inferAppEnv();
  const allowProductionSeed = process.env.ALLOW_PRODUCTION_SEED === "true";

  if ((appEnv === "production" || process.env.NODE_ENV === "production") && !allowProductionSeed) {
    throw new Error(
      "Seeding is blocked in production. Set ALLOW_PRODUCTION_SEED=true only if you intentionally need it.",
    );
  }
}

async function main() {
  assertSeedAllowed();

  const parsedResume = parseResume(resumeText);
  const jd = analyzeJobDescription(jobDescriptionText);
  const analysis = scoreResume(parsedResume, jd);
  const demoPasswordHash = await hashPassword(process.env.SEED_DEMO_PASSWORD ?? "DemoPass1234");
  const tailored = generateTailoredResume(
    resumeText,
    jobDescriptionText,
    "Software Engineer, Product",
    "Ramp",
  );
  const rewrite = rewriteBullet(parsedResume.experienceBullets[0], "tailored_to_jd", jobDescriptionText);

  const user = await prisma.user.upsert({
    where: { email: "demo@resumeforge.dev" },
    update: {
      name: "Aarav Patel",
      passwordHash: demoPasswordHash,
      headline: "MS student targeting product engineering roles in the U.S.",
      targetRole: "Software Engineer, Product",
      location: "Seattle, WA",
      role: "ADMIN",
      authProvider: "credentials",
    },
    create: {
      email: "demo@resumeforge.dev",
      name: "Aarav Patel",
      passwordHash: demoPasswordHash,
      headline: "MS student targeting product engineering roles in the U.S.",
      targetRole: "Software Engineer, Product",
      location: "Seattle, WA",
      role: "ADMIN",
      authProvider: "credentials",
    },
  });

  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.billingSession.deleteMany({ where: { userId: user.id } });
  await prisma.usageCounter.deleteMany({ where: { userId: user.id } });
  await prisma.aIGeneration.deleteMany({ where: { userId: user.id } });
  await prisma.resumeVersion.deleteMany({ where: { userId: user.id } });
  await prisma.jobDescription.deleteMany({ where: { userId: user.id } });
  await prisma.resume.deleteMany({ where: { userId: user.id } });

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: "PRO",
      status: "ACTIVE",
      provider: "MOCK",
      priceMonthly: 2900,
      entitlements: [
        "analysis_history",
        "tailored_resume",
        "version_compare",
        "priority_export",
        "customer_portal",
      ] as unknown as Prisma.InputJsonValue,
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    create: {
      userId: user.id,
      plan: "PRO",
      status: "ACTIVE",
      provider: "MOCK",
      priceMonthly: 2900,
      entitlements: [
        "analysis_history",
        "tailored_resume",
        "version_compare",
        "priority_export",
        "customer_portal",
      ] as unknown as Prisma.InputJsonValue,
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  const baseProfile = createDefaultResumeProfileData("quick");
  const profileData = {
    ...baseProfile,
    basicProfile: {
      ...baseProfile.basicProfile,
      fullName: "Aarav Patel",
      currentTitle: "MS Student / Software Engineer",
      targetTitle: "Software Engineer, Product",
      location: "Seattle, WA",
      careerLevel: "entry" as const,
    },
    professionalSummary:
      "Early-career software engineer with experience building internal tools and customer-facing product features.",
    skills: splitCsv("React, Next.js, TypeScript, PostgreSQL, Prisma, Python, SQL, REST APIs"),
  };

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: "Aarav Patel General Resume",
      intakeMode: "quick",
      originalText: resumeText,
      parsedSections: parsedResume as unknown as Prisma.InputJsonValue,
      profileData: profileData as unknown as Prisma.InputJsonValue,
      profileCompleteness: calculateResumeProfileCompleteness({
        originalText: resumeText,
        profile: profileData,
      }),
    },
  });

  const briefData: TargetRoleBriefData = {
    ...createDefaultTargetRoleBriefData(),
    seniorityLevel: "Entry to Mid",
    employmentType: "Full-time",
    workMode: "Hybrid",
    industryDomain: "FinTech",
    topRequiredSkills: ["React", "TypeScript", "PostgreSQL", "APIs", "Analytics"],
    emphasizeKeywords: ["product thinking", "ownership", "experimentation"],
    hiringPriorities: ["technical_depth", "execution", "communication"],
    atsIntensity: "High",
    technicalIntensity: "High",
  };

  const jobDescription = await prisma.jobDescription.create({
    data: {
      userId: user.id,
      company: "Ramp",
      role: "Software Engineer, Product",
      location: "New York, NY",
      description: jobDescriptionText,
      keywords: jd.keywords as unknown as Prisma.InputJsonValue,
      briefData: briefData as unknown as Prisma.InputJsonValue,
      briefCompleteness: calculateTargetRoleBriefCompleteness({
        company: "Ramp",
        role: "Software Engineer, Product",
        description: jobDescriptionText,
        brief: briefData,
      }),
    },
  });

  const originalVersion = await prisma.resumeVersion.create({
    data: {
      userId: user.id,
      resumeId: resume.id,
      name: "General Resume v1",
      type: "ORIGINAL",
      content: resumeText,
      summary: "Baseline imported resume.",
      score: analysis.overall,
      comparisonNotes: [
        "Strong technical baseline for early-career product roles.",
        "Needs more direct alignment to experimentation and performance keywords.",
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  const tailoredVersion = await prisma.resumeVersion.create({
    data: {
      userId: user.id,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      name: tailored.name,
      type: "TAILORED",
      content: tailored.content,
      summary: tailored.summary,
      score: tailored.score,
      comparisonNotes: tailored.highlights as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.resumeVersion.create({
    data: {
      userId: user.id,
      resumeId: resume.id,
      jobDescriptionId: jobDescription.id,
      name: "Leadership Cut",
      type: "REWRITE",
      content: resumeText.replace(parsedResume.experienceBullets[1], rewriteBullet(parsedResume.experienceBullets[1], "leadership_focused").after),
      summary: "Leadership-forward version for cross-functional product teams.",
      score: Math.min(99, analysis.overall + 4),
      comparisonNotes: [
        "Increases ownership language across the experience section.",
        "Useful for associate PM-adjacent or customer-facing engineering roles.",
      ] as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.aIGeneration.createMany({
    data: [
      {
        userId: user.id,
        resumeId: resume.id,
        jobDescriptionId: jobDescription.id,
        resumeVersionId: originalVersion.id,
        type: "ANALYSIS",
        input: {
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
        } as unknown as Prisma.InputJsonValue,
        output: analysis as unknown as Prisma.InputJsonValue,
      },
      {
        userId: user.id,
        resumeId: resume.id,
        jobDescriptionId: jobDescription.id,
        resumeVersionId: tailoredVersion.id,
        type: "TAILORED_RESUME",
        input: {
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
        } as unknown as Prisma.InputJsonValue,
        output: tailored as unknown as Prisma.InputJsonValue,
      },
      {
        userId: user.id,
        resumeId: resume.id,
        jobDescriptionId: jobDescription.id,
        resumeVersionId: originalVersion.id,
        type: "BULLET_REWRITE",
        input: {
          bullet: parsedResume.experienceBullets[0],
          mode: "tailored_to_jd",
        } as unknown as Prisma.InputJsonValue,
        output: rewrite as unknown as Prisma.InputJsonValue,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      amount: 2900,
      currency: "USD",
      status: "PAID",
      provider: "MOCK",
      externalId: "mock_pro",
    },
  });

  await prisma.billingSession.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      provider: "MOCK",
      type: "CHECKOUT",
      status: "COMPLETED",
      plan: "PRO",
      externalId: "mock_checkout_seed",
      url: "http://localhost:3000/dashboard/billing?checkout=mock",
      metadata: {
        seed: true,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.usageCounter.upsert({
    where: { userId: user.id },
    update: {
      analysesUsed: 3,
      bulletRewritesUsed: 5,
      tailoredDraftsUsed: 2,
      lastAnalysisAt: new Date(),
      lastBulletRewriteAt: new Date(),
      lastTailoredDraftAt: new Date(),
    },
    create: {
      userId: user.id,
      analysesUsed: 3,
      bulletRewritesUsed: 5,
      tailoredDraftsUsed: 2,
      lastAnalysisAt: new Date(),
      lastBulletRewriteAt: new Date(),
      lastTailoredDraftAt: new Date(),
    },
  });

  console.log("Seeded ResumeForge local workspace.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
