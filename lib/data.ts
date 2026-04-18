import { Prisma } from "@prisma/client";
import type {
  AIGenerationRecord,
  AppSnapshot,
  AppUser,
  BillingSessionRecord,
  JobDescriptionRecord,
  PaymentRecord,
  ResumeAnalysis,
  ResumeIntakeMode,
  ResumeProfileData,
  ResumeRecord,
  ResumeVersionRecord,
  RewriteMode,
  RewriteResult,
  SubscriptionRecord,
  TargetRoleBriefData,
  TailoredResumeOutput,
  UsageCounterRecord,
} from "@/lib/types";
import { getAIService } from "@/lib/ai";
import type { SessionIdentity } from "@/lib/auth";
import { allowDevelopmentMocks } from "@/lib/env";
import {
  AuthenticationError,
  ConfigurationError,
  ValidationError,
} from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { getFallbackSnapshot } from "@/lib/mock-data";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { parseResume } from "@/lib/services/resume-parser";
import type { UsageAction } from "@/lib/usage";
import {
  buildJobDescriptionText,
  buildResumeTextFromProfile,
  calculateResumeProfileCompleteness,
  calculateTargetRoleBriefCompleteness,
  createDefaultResumeProfileData,
  createDefaultTargetRoleBriefData,
  normalizeResumeProfileData,
  normalizeTargetRoleBriefData,
  splitCsv,
} from "@/lib/workshop";

const warnedMessages = new Set<string>();

function warnOnce(message: string) {
  if (!warnedMessages.has(message)) {
    warnedMessages.add(message);
    logEvent("warn", message);
  }
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toISOString();
}

function parseJson<T>(value: Prisma.JsonValue, fallback: T): T {
  if (!value) {
    return fallback;
  }

  return value as T;
}

function mapUser(user: {
  id: string;
  email: string;
  name: string;
  headline: string | null;
  targetRole: string | null;
  location: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
}): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    headline: user.headline ?? "",
    targetRole: user.targetRole ?? "Software Engineer",
    location: user.location ?? "United States",
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function mapSubscription(
  subscription:
    | {
        id: string;
        userId: string;
        plan: "FREE" | "PRO" | "PREMIUM_REVIEW";
        status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING";
        provider: "MOCK" | "STRIPE";
        priceMonthly: number;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        cancelAtPeriodEnd: boolean;
        entitlements: Prisma.JsonValue | null;
        currentPeriodEnd: Date | null;
      }
    | null
    | undefined,
): SubscriptionRecord | null {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    userId: subscription.userId,
    plan: subscription.plan,
    status: subscription.status,
    provider: subscription.provider,
    priceMonthly: subscription.priceMonthly,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    entitlements: parseJson<string[]>(subscription.entitlements ?? [], []),
    currentPeriodEnd: serializeDate(subscription.currentPeriodEnd),
  };
}

function mapResume(resume: {
  id: string;
  userId: string;
  title: string;
  intakeMode: string;
  originalText: string;
  parsedSections: Prisma.JsonValue;
  profileData: Prisma.JsonValue | null;
  profileCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
}): ResumeRecord {
  const intakeMode = (resume.intakeMode === "guided" ? "guided" : "quick") as ResumeIntakeMode;
  const parsedProfile = resume.profileData
    ? (resume.profileData as unknown as ResumeProfileData)
    : createDefaultResumeProfileData(intakeMode);

  return {
    id: resume.id,
    userId: resume.userId,
    title: resume.title,
    intakeMode,
    originalText: resume.originalText,
    parsed: parseJson(resume.parsedSections, parseResume(resume.originalText)),
    profileData: normalizeResumeProfileData(parsedProfile, intakeMode),
    profileCompleteness: resume.profileCompleteness,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };
}

function mapJobDescription(jobDescription: {
  id: string;
  userId: string;
  company: string;
  role: string;
  location: string | null;
  description: string;
  keywords: Prisma.JsonValue;
  briefData: Prisma.JsonValue | null;
  briefCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
}): JobDescriptionRecord {
  const parsedBrief = jobDescription.briefData
    ? (jobDescription.briefData as unknown as TargetRoleBriefData)
    : createDefaultTargetRoleBriefData();

  return {
    id: jobDescription.id,
    userId: jobDescription.userId,
    company: jobDescription.company,
    role: jobDescription.role,
    location: jobDescription.location ?? "",
    description: jobDescription.description,
    keywords: parseJson<string[]>(jobDescription.keywords, []),
    briefData: normalizeTargetRoleBriefData(parsedBrief),
    briefCompleteness: jobDescription.briefCompleteness,
    createdAt: jobDescription.createdAt.toISOString(),
    updatedAt: jobDescription.updatedAt.toISOString(),
  };
}

function mapVersion(version: {
  id: string;
  userId: string;
  resumeId: string;
  jobDescriptionId: string | null;
  name: string;
  type: "ORIGINAL" | "TAILORED" | "REWRITE" | "IMPORTED";
  content: string;
  summary: string | null;
  score: number | null;
  comparisonNotes: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): ResumeVersionRecord {
  return {
    id: version.id,
    userId: version.userId,
    resumeId: version.resumeId,
    jobDescriptionId: version.jobDescriptionId,
    name: version.name,
    type: version.type,
    content: version.content,
    summary: version.summary ?? "",
    score: version.score,
    comparisonNotes: parseJson<string[]>(version.comparisonNotes ?? [], []),
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  };
}

function mapGeneration(generation: {
  id: string;
  userId: string;
  resumeId: string | null;
  jobDescriptionId: string | null;
  resumeVersionId: string | null;
  type: "ANALYSIS" | "BULLET_REWRITE" | "TAILORED_RESUME";
  input: Prisma.JsonValue;
  output: Prisma.JsonValue;
  createdAt: Date;
}): AIGenerationRecord {
  return {
    id: generation.id,
    userId: generation.userId,
    resumeId: generation.resumeId,
    jobDescriptionId: generation.jobDescriptionId,
    resumeVersionId: generation.resumeVersionId,
    type: generation.type,
    input: parseJson<Record<string, unknown>>(generation.input, {}),
    output: parseJson<Record<string, unknown>>(generation.output, {}),
    createdAt: generation.createdAt.toISOString(),
  };
}

function mapPayment(payment: {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  provider: "MOCK" | "STRIPE";
  externalId: string | null;
  createdAt: Date;
}): PaymentRecord {
  return {
    id: payment.id,
    userId: payment.userId,
    subscriptionId: payment.subscriptionId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    externalId: payment.externalId,
    createdAt: payment.createdAt.toISOString(),
  };
}

function mapBillingSession(session: {
  id: string;
  userId: string;
  subscriptionId: string | null;
  provider: "MOCK" | "STRIPE";
  type: "CHECKOUT" | "PORTAL";
  status: "OPEN" | "COMPLETED" | "EXPIRED" | "FAILED";
  plan: "FREE" | "PRO" | "PREMIUM_REVIEW" | null;
  externalId: string | null;
  externalCustomerId: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BillingSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    subscriptionId: session.subscriptionId,
    provider: session.provider,
    type: session.type,
    status: session.status,
    plan: session.plan,
    externalId: session.externalId,
    externalCustomerId: session.externalCustomerId,
    url: session.url,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function mapUsage(
  usage:
    | {
        id: string;
        userId: string;
        analysesUsed: number;
        bulletRewritesUsed: number;
        tailoredDraftsUsed: number;
        lastAnalysisAt: Date | null;
        lastBulletRewriteAt: Date | null;
        lastTailoredDraftAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | null
    | undefined,
  userId: string,
): UsageCounterRecord {
  if (!usage) {
    const now = new Date().toISOString();

    return {
      id: `usage_${userId}`,
      userId,
      analysesUsed: 0,
      bulletRewritesUsed: 0,
      tailoredDraftsUsed: 0,
      lastAnalysisAt: null,
      lastBulletRewriteAt: null,
      lastTailoredDraftAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: usage.id,
    userId: usage.userId,
    analysesUsed: usage.analysesUsed,
    bulletRewritesUsed: usage.bulletRewritesUsed,
    tailoredDraftsUsed: usage.tailoredDraftsUsed,
    lastAnalysisAt: serializeDate(usage.lastAnalysisAt),
    lastBulletRewriteAt: serializeDate(usage.lastBulletRewriteAt),
    lastTailoredDraftAt: serializeDate(usage.lastTailoredDraftAt),
    createdAt: usage.createdAt.toISOString(),
    updatedAt: usage.updatedAt.toISOString(),
  };
}

async function withFallback<T>(
  run: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!isDatabaseConfigured) {
    if (!allowDevelopmentMocks) {
      throw new ConfigurationError("DATABASE_URL is required in this environment.");
    }

    return fallback();
  }

  try {
    return await run();
  } catch (error) {
    if (!allowDevelopmentMocks) {
      throw error;
    }

    warnOnce(
      `ResumeForge database fallback is active because Prisma could not complete the request: ${error instanceof Error ? error.message : String(error)}`,
    );
    return fallback();
  }
}

export async function createCredentialUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return withFallback(
    async () => {
      try {
        return await prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash,
            authProvider: "credentials",
            headline: "ResumeForge user",
            targetRole: "Software Engineer",
            location: "United States",
            role: "USER",
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ValidationError("An account with this email already exists.");
        }

        throw error;
      }
    },
    async () => {
      throw new ValidationError(
        "Database is not available. Start PostgreSQL and run migrations before creating accounts.",
      );
    },
  );
}

export async function findUserForLogin(email: string) {
  return withFallback(
    async () =>
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
        },
      }),
    async () => null,
  );
}

export async function getAppSnapshot(identity?: SessionIdentity | null): Promise<AppSnapshot> {
  if (!identity) {
    if (allowDevelopmentMocks) {
      return getFallbackSnapshot();
    }

    throw new AuthenticationError();
  }

  return withFallback(
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: identity.userId },
        include: {
          subscription: true,
          resumes: {
            orderBy: { updatedAt: "desc" },
          },
          jobDescriptions: {
            orderBy: { updatedAt: "desc" },
          },
          resumeVersions: {
            orderBy: { updatedAt: "desc" },
          },
          aiGenerations: {
            orderBy: { createdAt: "desc" },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
          billingSessions: {
            orderBy: { createdAt: "desc" },
          },
          usageCounter: true,
        },
      });

      if (!user) {
        throw new AuthenticationError();
      }

      return {
        user: mapUser(user),
        subscription: mapSubscription(user.subscription),
        resumes: user.resumes.map(mapResume),
        jobDescriptions: user.jobDescriptions.map(mapJobDescription),
        resumeVersions: user.resumeVersions.map(mapVersion),
        aiGenerations: user.aiGenerations.map(mapGeneration),
        payments: user.payments.map(mapPayment),
        billingSessions: user.billingSessions.map(mapBillingSession),
        usage: mapUsage(user.usageCounter, user.id),
      };
    },
    async () => getFallbackSnapshot(identity),
  );
}

async function getAppSnapshotByUserId(userId: string) {
  return getAppSnapshot({
    userId,
    email: "",
    name: "",
    role: "USER",
  });
}

function resolveSnapshotRecords(
  snapshot: AppSnapshot,
  input: { resumeId: string; jobDescriptionId: string },
) {
  const resume = snapshot.resumes.find((item) => item.id === input.resumeId);
  const jobDescription = snapshot.jobDescriptions.find((item) => item.id === input.jobDescriptionId);

  if (!resume) {
    throw new ValidationError("Selected resume could not be found.");
  }

  if (!jobDescription) {
    throw new ValidationError("Selected job description could not be found.");
  }

  return { resume, jobDescription };
}

export async function createResumeRecord(input: {
  userId: string;
  resumeId?: string;
  title: string;
  originalText: string;
  intakeMode: ResumeIntakeMode;
  profileData?: ResumeProfileData | null;
  createVersion?: boolean;
}) {
  // TODO: replace paste-only intake with PDF/DOCX parsing before persisting.
  const profileData = normalizeResumeProfileData(input.profileData, input.intakeMode);
  const resolvedText = buildResumeTextFromProfile({
    title: input.title,
    profile: profileData,
    fallbackText: input.originalText,
  });
  const safeText =
    resolvedText.length >= 40
      ? resolvedText
      : `${input.title}\n\nResume draft saved. Add more detail in guided mode to improve analysis quality.`;
  const parsed = parseResume(safeText);
  const profileCompleteness = calculateResumeProfileCompleteness({
    originalText: safeText,
    profile: profileData,
  });
  const shouldCreateVersion = input.createVersion ?? true;

  return withFallback(
    async () => {
      const result = await prisma.$transaction(async (transaction) => {
        const resume = input.resumeId
          ? await transaction.resume.update({
              where: { id: input.resumeId },
              data: {
                title: input.title,
                intakeMode: input.intakeMode,
                originalText: safeText,
                parsedSections: parsed as unknown as Prisma.InputJsonValue,
                profileData: profileData as unknown as Prisma.InputJsonValue,
                profileCompleteness,
              },
            })
          : await transaction.resume.create({
              data: {
                userId: input.userId,
                title: input.title,
                intakeMode: input.intakeMode,
                originalText: safeText,
                parsedSections: parsed as unknown as Prisma.InputJsonValue,
                profileData: profileData as unknown as Prisma.InputJsonValue,
                profileCompleteness,
              },
            });

        if (shouldCreateVersion) {
          const hasOriginalVersion = await transaction.resumeVersion.count({
            where: {
              resumeId: resume.id,
              type: "ORIGINAL",
            },
          });

          if (hasOriginalVersion === 0) {
            await transaction.resumeVersion.create({
              data: {
                userId: input.userId,
                resumeId: resume.id,
                name: `${input.title} Original`,
                type: "ORIGINAL",
                content: safeText,
                summary: "Imported baseline resume.",
                score: null,
                comparisonNotes: ["Original source version for future tailoring."],
              },
            });
          }
        }

        return resume;
      });

      return result.id;
    },
    async () => "fallback-resume",
  );
}

export async function createJobDescriptionRecord(input: {
  userId: string;
  jobDescriptionId?: string;
  company: string;
  role: string;
  location: string;
  description: string;
  briefData?: TargetRoleBriefData | null;
}) {
  const briefData = normalizeTargetRoleBriefData(input.briefData);
  const resolvedDescription = buildJobDescriptionText({
    company: input.company,
    role: input.role,
    location: input.location,
    description: input.description,
    brief: briefData,
  });
  const safeDescription =
    resolvedDescription.length >= 80
      ? resolvedDescription
      : `${input.company} ${input.role}\n\n${resolvedDescription || "Target role brief saved as draft. Add more job description detail to improve ATS analysis."}`;
  const briefCompleteness = calculateTargetRoleBriefCompleteness({
    company: input.company,
    role: input.role,
    description: safeDescription,
    brief: briefData,
  });

  let keywords = [...briefData.topRequiredSkills, ...briefData.emphasizeKeywords];

  if (safeDescription.length >= 80) {
    const ai = getAIService({ preferLive: true });
    const analysis = await ai.analyzeJobDescription({
      jobDescriptionText: safeDescription,
    });
    keywords = analysis.keywords;
  } else if (keywords.length === 0) {
    keywords = splitCsv(`${input.role}, ${input.company}`);
  }

  return withFallback(
    async () => {
      const result = input.jobDescriptionId
        ? await prisma.jobDescription.update({
            where: { id: input.jobDescriptionId },
            data: {
              company: input.company,
              role: input.role,
              location: input.location || null,
              description: safeDescription,
              keywords: keywords as unknown as Prisma.InputJsonValue,
              briefData: briefData as unknown as Prisma.InputJsonValue,
              briefCompleteness,
            },
          })
        : await prisma.jobDescription.create({
            data: {
              userId: input.userId,
              company: input.company,
              role: input.role,
              location: input.location || null,
              description: safeDescription,
              keywords: keywords as unknown as Prisma.InputJsonValue,
              briefData: briefData as unknown as Prisma.InputJsonValue,
              briefCompleteness,
            },
          });

      return result.id;
    },
    async () => "fallback-jd",
  );
}

export async function saveAnalysisGeneration(input: {
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
}, sourceSnapshot?: AppSnapshot): Promise<ResumeAnalysis> {
  const ai = getAIService({ preferLive: true });
  const snapshot = sourceSnapshot ?? (await getAppSnapshotByUserId(input.userId));
  const { resume, jobDescription } = resolveSnapshotRecords(snapshot, input);
  const analysis = await ai.scoreResume({
    resumeText: resume.originalText,
    parsedResume: resume.parsed,
    jobDescriptionText: jobDescription.description,
  });

  await withFallback(
    async () => {
      await prisma.aIGeneration.create({
        data: {
          userId: input.userId,
          resumeId: input.resumeId,
          jobDescriptionId: input.jobDescriptionId,
          type: "ANALYSIS",
          input: {
            resumeId: input.resumeId,
            jobDescriptionId: input.jobDescriptionId,
          } as Prisma.InputJsonValue,
          output: analysis as unknown as Prisma.InputJsonValue,
        },
      });
    },
    async () => null,
  );

  return analysis;
}

export async function createTailoredResumeVersion(input: {
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
  customName?: string;
}, sourceSnapshot?: AppSnapshot): Promise<TailoredResumeOutput> {
  const ai = getAIService({ preferLive: true });
  const snapshot = sourceSnapshot ?? (await getAppSnapshotByUserId(input.userId));
  const { resume, jobDescription } = resolveSnapshotRecords(snapshot, input);
  const output = await ai.generateTailoredResume({
    resumeText: resume.originalText,
    jobDescriptionText: jobDescription.description,
    jobRole: jobDescription.role,
    company: jobDescription.company,
  });

  await withFallback(
    async () => {
      const version = await prisma.resumeVersion.create({
        data: {
          userId: input.userId,
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
          name: input.customName || output.name,
          type: "TAILORED",
          content: output.content,
          summary: output.summary,
          score: output.score,
          comparisonNotes: output.highlights as unknown as Prisma.InputJsonValue,
        },
      });

      await prisma.aIGeneration.create({
        data: {
          userId: input.userId,
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
          resumeVersionId: version.id,
          type: "TAILORED_RESUME",
          input: {
            resumeId: resume.id,
            jobDescriptionId: jobDescription.id,
          } as Prisma.InputJsonValue,
          output: output as unknown as Prisma.InputJsonValue,
        },
      });
    },
    async () => null,
  );

  return output;
}

export async function generateTailoredResumeDraft(input: {
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
}, sourceSnapshot?: AppSnapshot): Promise<TailoredResumeOutput> {
  const ai = getAIService({ preferLive: true });
  const snapshot = sourceSnapshot ?? (await getAppSnapshotByUserId(input.userId));
  const { resume, jobDescription } = resolveSnapshotRecords(snapshot, input);
  const output = await ai.generateTailoredResume({
    resumeText: resume.originalText,
    jobDescriptionText: jobDescription.description,
    jobRole: jobDescription.role,
    company: jobDescription.company,
  });

  await withFallback(
    async () => {
      await prisma.aIGeneration.create({
        data: {
          userId: input.userId,
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
          resumeVersionId: null,
          type: "TAILORED_RESUME",
          input: {
            resumeId: resume.id,
            jobDescriptionId: jobDescription.id,
            draft: true,
          } as Prisma.InputJsonValue,
          output: output as unknown as Prisma.InputJsonValue,
        },
      });
    },
    async () => null,
  );

  return output;
}

export async function saveBulletRewrite(input: {
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
  bullet: string;
  mode: RewriteMode;
}, sourceSnapshot?: AppSnapshot): Promise<RewriteResult> {
  const ai = getAIService({ preferLive: true });
  const snapshot = sourceSnapshot ?? (await getAppSnapshotByUserId(input.userId));
  const { resume, jobDescription } = resolveSnapshotRecords(snapshot, input);
  const output = await ai.rewriteBullet({
    bullet: input.bullet,
    mode: input.mode,
    jobDescriptionText: jobDescription.description,
    resumeText: resume.originalText,
  });

  await withFallback(
    async () => {
      await prisma.aIGeneration.create({
        data: {
          userId: input.userId,
          resumeId: input.resumeId,
          jobDescriptionId: input.jobDescriptionId,
          type: "BULLET_REWRITE",
          input: {
            bullet: input.bullet,
            mode: input.mode,
          } as Prisma.InputJsonValue,
          output: output as unknown as Prisma.InputJsonValue,
        },
      });
    },
    async () => null,
  );

  return output;
}

export async function updateUserSettings(input: {
  userId: string;
  name: string;
  headline: string;
  targetRole: string;
  location: string;
}) {
  await withFallback(
    async () => {
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          name: input.name,
          headline: input.headline,
          targetRole: input.targetRole,
          location: input.location,
        },
      });
    },
    async () => null,
  );
}

export async function incrementUsageCounter(input: {
  userId: string;
  action: UsageAction;
}) {
  await withFallback(
    async () => {
      const now = new Date();

      await prisma.usageCounter.upsert({
        where: { userId: input.userId },
        update:
          input.action === "analysis"
            ? {
                analysesUsed: { increment: 1 },
                lastAnalysisAt: now,
              }
            : input.action === "bullet_rewrite"
              ? {
                  bulletRewritesUsed: { increment: 1 },
                  lastBulletRewriteAt: now,
                }
              : {
                  tailoredDraftsUsed: { increment: 1 },
                  lastTailoredDraftAt: now,
                },
        create: {
          userId: input.userId,
          analysesUsed: input.action === "analysis" ? 1 : 0,
          bulletRewritesUsed: input.action === "bullet_rewrite" ? 1 : 0,
          tailoredDraftsUsed: input.action === "tailored_draft" ? 1 : 0,
          lastAnalysisAt: input.action === "analysis" ? now : null,
          lastBulletRewriteAt: input.action === "bullet_rewrite" ? now : null,
          lastTailoredDraftAt: input.action === "tailored_draft" ? now : null,
        },
      });
    },
    async () => null,
  );
}

export async function getExportableVersion(versionId: string) {
  return withFallback(
    async () => {
      const version = await prisma.resumeVersion.findUnique({
        where: { id: versionId },
      });

      return version ? mapVersion(version) : null;
    },
    async () => {
      const snapshot = getFallbackSnapshot();
      return snapshot.resumeVersions.find((version) => version.id === versionId) ?? snapshot.resumeVersions[0];
    },
  );
}

export async function getAdminMetrics() {
  return withFallback(
    async () => {
      const [users, resumes, versions, generations, subscriptions, payments] = await Promise.all([
        prisma.user.count(),
        prisma.resume.count(),
        prisma.resumeVersion.count(),
        prisma.aIGeneration.count(),
        prisma.subscription.findMany(),
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);

      const monthlyRevenue = subscriptions.reduce((sum, subscription) => {
        return subscription.status === "ACTIVE" ? sum + subscription.priceMonthly : sum;
      }, 0);

      return {
        users,
        resumes,
        versions,
        generations,
        monthlyRevenue,
        planDistribution: subscriptions.reduce<Record<string, number>>((accumulator, item) => {
          accumulator[item.plan] = (accumulator[item.plan] ?? 0) + 1;
          return accumulator;
        }, {}),
        recentPayments: payments.map(mapPayment),
      };
    },
    async () => {
      const snapshot = getFallbackSnapshot();
      return {
        users: 1,
        resumes: snapshot.resumes.length,
        versions: snapshot.resumeVersions.length,
        generations: snapshot.aiGenerations.length,
        monthlyRevenue: snapshot.subscription?.priceMonthly ?? 0,
        planDistribution: {
          [snapshot.subscription?.plan ?? "FREE"]: 1,
        },
        recentPayments: snapshot.payments,
      };
    },
  );
}
