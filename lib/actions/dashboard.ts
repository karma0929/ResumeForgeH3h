"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getSessionIdentity } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/billing/guards";
import { RateLimitError, ValidationError } from "@/lib/errors";
import {
  createJobDescriptionRecord,
  createResumeRecord,
  generateTailoredResumeDraft,
  createTailoredResumeVersion,
  incrementUsageCounter,
  saveAnalysisGeneration,
  saveBulletRewrite,
  updateUserSettings,
  getAppSnapshot,
} from "@/lib/data";
import { assertUsageCooldown, getUsageUpgradePrompt, hasUsageRemaining } from "@/lib/usage";
import { assertEnumValue, readStringField } from "@/lib/validation";
import type {
  CareerLevel,
  ResumeIntakeMode,
  ResumeProfileData,
  RewriteMode,
  TargetRoleBriefData,
} from "@/lib/types";
import { splitCsv, splitMultiline } from "@/lib/workshop";

async function requireSnapshot() {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect("/login");
  }

  return getAppSnapshot(identity);
}

function redirectForUsageLimit(action: "analysis" | "bullet_rewrite") {
  const prompt = getUsageUpgradePrompt(action);
  redirect(`/dashboard/billing?usageLimit=${action}&targetPlan=${prompt.targetPlan}&blocked=1`);
}

function readLines(formData: FormData, key: string, max = 3000) {
  return splitMultiline(readStringField(formData, key, { max }));
}

function readCsv(formData: FormData, key: string, max = 2000) {
  return splitCsv(readStringField(formData, key, { max }));
}

function readValueWithFallback(
  formData: FormData,
  key: string,
  options: { max?: number; min?: number; required?: boolean },
  fallback: string,
) {
  if (!formData.has(key)) {
    return fallback;
  }

  return readStringField(formData, key, {
    max: options.max,
    min: options.min,
    required: options.required,
  });
}

function parseWizardStep(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1 || parsed > 7) {
    return null;
  }

  return parsed;
}

function buildUploadRedirectPath(input: {
  basePath: string;
  step: number | null;
  query: Record<string, string>;
}) {
  const params = new URLSearchParams(input.query);

  if (input.step) {
    params.set("step", String(input.step));
  }

  return `${input.basePath}?${params.toString()}`;
}

export async function saveResumeAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const currentStep = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    const nextStep = parseWizardStep(readStringField(formData, "nextStep", { max: 10, fallback: "" }));
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const intakeMode = assertEnumValue(
      readValueWithFallback(formData, "intakeMode", { max: 20 }, snapshot.resumes[0]?.intakeMode ?? "quick"),
      ["quick", "guided"] as const,
      "intakeMode",
    ) as ResumeIntakeMode;
    const resumeId = readStringField(formData, "resumeId", { max: 120 });
    const existingResume = resumeId
      ? snapshot.resumes.find((resume) => resume.id === resumeId) ?? snapshot.resumes[0]
      : snapshot.resumes[0];
    const existingProfile = existingResume?.profileData;
    const titleInput = readValueWithFallback(formData, "title", { max: 120 }, existingResume?.title ?? "");
    const title = titleInput || (intakeMode === "guided" ? "Guided Resume Draft" : "Resume Draft");

    if (!isDraft && title.length < 3) {
      throw new ValidationError("title must be at least 3 characters.");
    }

    const quickResumeText = readValueWithFallback(
      formData,
      "quickResumeText",
      { max: 15000 },
      existingResume?.originalText ?? "",
    );

    if (!isDraft && intakeMode === "quick" && quickResumeText.length < 40) {
      throw new ValidationError("quickResumeText must be at least 40 characters.");
    }

    const careerLevel = readValueWithFallback(
      formData,
      "careerLevel",
      { max: 40 },
      existingProfile?.basicProfile.careerLevel ?? "",
    ) as CareerLevel | "";
    const experienceEntries = [1, 2].map((index) => ({
      company: readValueWithFallback(
        formData,
        `exp${index}_company`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.company ?? "",
      ),
      title: readValueWithFallback(
        formData,
        `exp${index}_title`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.title ?? "",
      ),
      location: readValueWithFallback(
        formData,
        `exp${index}_location`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.location ?? "",
      ),
      dates: readValueWithFallback(
        formData,
        `exp${index}_dates`,
        { max: 80 },
        existingProfile?.workExperiences[index - 1]?.dates ?? "",
      ),
      responsibilities: readValueWithFallback(
        formData,
        `exp${index}_responsibilities`,
        { max: 800 },
        existingProfile?.workExperiences[index - 1]?.responsibilities ?? "",
      ),
      achievements: readValueWithFallback(
        formData,
        `exp${index}_achievements`,
        { max: 800 },
        existingProfile?.workExperiences[index - 1]?.achievements ?? "",
      ),
      quantifiedImpact: readValueWithFallback(
        formData,
        `exp${index}_quantifiedImpact`,
        { max: 500 },
        existingProfile?.workExperiences[index - 1]?.quantifiedImpact ?? "",
      ),
    }));

    const profileData: ResumeProfileData = {
      mode: intakeMode,
      basicProfile: {
        fullName: readValueWithFallback(formData, "fullName", { max: 120 }, existingProfile?.basicProfile.fullName ?? ""),
        currentTitle: readValueWithFallback(
          formData,
          "currentTitle",
          { max: 120 },
          existingProfile?.basicProfile.currentTitle ?? "",
        ),
        targetTitle: readValueWithFallback(
          formData,
          "targetTitle",
          { max: 120 },
          existingProfile?.basicProfile.targetTitle ?? "",
        ),
        location: readValueWithFallback(
          formData,
          "profileLocation",
          { max: 120 },
          existingProfile?.basicProfile.location ?? "",
        ),
        workAuthorization: readValueWithFallback(
          formData,
          "workAuthorization",
          { max: 120 },
          existingProfile?.basicProfile.workAuthorization ?? "",
        ),
        yearsExperience: readValueWithFallback(
          formData,
          "yearsExperience",
          { max: 40 },
          existingProfile?.basicProfile.yearsExperience ?? "",
        ),
        careerLevel,
      },
      professionalSummary: readValueWithFallback(
        formData,
        "professionalSummary",
        { max: 2000 },
        existingProfile?.professionalSummary ?? "",
      ),
      skills: formData.has("skillsCsv")
        ? readCsv(formData, "skillsCsv", 3000)
        : (existingProfile?.skills ?? []),
      workExperiences: experienceEntries.filter((entry) => Object.values(entry).some(Boolean)),
      education: formData.has("educationLines")
        ? readLines(formData, "educationLines", 3000)
        : (existingProfile?.education ?? []),
      projects: formData.has("projectLines")
        ? readLines(formData, "projectLines", 3000)
        : (existingProfile?.projects ?? []),
      certifications: formData.has("certificationLines")
        ? readLines(formData, "certificationLines", 2000)
        : (existingProfile?.certifications ?? []),
      awards: formData.has("awardLines")
        ? readLines(formData, "awardLines", 2000)
        : (existingProfile?.awards ?? []),
      links: {
        linkedIn: readValueWithFallback(
          formData,
          "linkedInUrl",
          { max: 240 },
          existingProfile?.links.linkedIn ?? "",
        ),
        github: readValueWithFallback(
          formData,
          "githubUrl",
          { max: 240 },
          existingProfile?.links.github ?? "",
        ),
        portfolio: readValueWithFallback(
          formData,
          "portfolioUrl",
          { max: 240 },
          existingProfile?.links.portfolio ?? "",
        ),
      },
      preferences: {
        resumeStyle: readValueWithFallback(
          formData,
          "resumeStyle",
          { max: 120 },
          existingProfile?.preferences.resumeStyle ?? "",
        ),
        keywordEmphasis: readValueWithFallback(
          formData,
          "keywordEmphasis",
          { max: 400 },
          existingProfile?.preferences.keywordEmphasis ?? "",
        ),
        industryPreference: readValueWithFallback(
          formData,
          "industryPreference",
          { max: 240 },
          existingProfile?.preferences.industryPreference ?? "",
        ),
      },
      notes: readValueWithFallback(formData, "resumeNotes", { max: 2000 }, existingProfile?.notes ?? ""),
    };

    await createResumeRecord({
      userId: snapshot.user.id,
      resumeId: resumeId || snapshot.resumes[0]?.id,
      title,
      originalText: quickResumeText,
      intakeMode,
      profileData,
      createVersion: !isDraft,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step: nextStep ?? currentStep,
        query: {
          resumeSaved: "1",
          ...(isDraft ? { draft: "1" } : {}),
        },
      }),
    );
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save resume.";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    redirect(
      buildUploadRedirectPath({
        basePath: "/dashboard/upload",
        step,
        query: { error: message },
      }),
    );
  }
}

export async function saveJobDescriptionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const currentStep = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    const nextStep = parseWizardStep(readStringField(formData, "nextStep", { max: 10, fallback: "" }));
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { max: 120 });
    const existingJobDescription = jobDescriptionId
      ? snapshot.jobDescriptions.find((jobDescription) => jobDescription.id === jobDescriptionId) ??
        snapshot.jobDescriptions[0]
      : snapshot.jobDescriptions[0];
    const existingBrief = existingJobDescription?.briefData;
    const company = readValueWithFallback(
      formData,
      "company",
      { max: 120 },
      existingJobDescription?.company ?? "",
    );
    const role = readValueWithFallback(
      formData,
      "role",
      { max: 120 },
      existingJobDescription?.role ?? "",
    );
    const location = readValueWithFallback(
      formData,
      "location",
      { max: 120 },
      existingJobDescription?.location ?? "",
    );
    const description = readValueWithFallback(
      formData,
      "description",
      { max: 20000 },
      existingJobDescription?.description ?? "",
    );

    if (!isDraft && company.length < 2) {
      throw new ValidationError("company must be at least 2 characters.");
    }

    if (!isDraft && role.length < 2) {
      throw new ValidationError("role must be at least 2 characters.");
    }

    if (!isDraft && description.length < 80) {
      throw new ValidationError("description must be at least 80 characters.");
    }

    const allowedPriorities: TargetRoleBriefData["hiringPriorities"] = [
      "technical_depth",
      "communication",
      "leadership",
      "execution",
      "research",
      "product_thinking",
    ];
    const hiringPriorities = formData.has("hiringPriorities")
      ? formData
          .getAll("hiringPriorities")
          .map((value) => (typeof value === "string" ? value : ""))
          .filter((value): value is TargetRoleBriefData["hiringPriorities"][number] =>
            allowedPriorities.includes(value as TargetRoleBriefData["hiringPriorities"][number]),
          )
      : (existingBrief?.hiringPriorities ?? []);

    const briefData: TargetRoleBriefData = {
      seniorityLevel: readValueWithFallback(
        formData,
        "seniorityLevel",
        { max: 120 },
        existingBrief?.seniorityLevel ?? "",
      ),
      employmentType: readValueWithFallback(
        formData,
        "employmentType",
        { max: 120 },
        existingBrief?.employmentType ?? "",
      ),
      workMode: readValueWithFallback(formData, "workMode", { max: 120 }, existingBrief?.workMode ?? ""),
      industryDomain: readValueWithFallback(
        formData,
        "industryDomain",
        { max: 240 },
        existingBrief?.industryDomain ?? "",
      ),
      salaryRange: readValueWithFallback(
        formData,
        "salaryRange",
        { max: 120 },
        existingBrief?.salaryRange ?? "",
      ),
      topRequiredSkills: formData.has("topRequiredSkills")
        ? readCsv(formData, "topRequiredSkills", 2500)
        : (existingBrief?.topRequiredSkills ?? []),
      preferredSkills: formData.has("preferredSkills")
        ? readCsv(formData, "preferredSkills", 2500)
        : (existingBrief?.preferredSkills ?? []),
      emphasizeKeywords: formData.has("emphasizeKeywords")
        ? readCsv(formData, "emphasizeKeywords", 2500)
        : (existingBrief?.emphasizeKeywords ?? []),
      responsibilitiesSummary: readValueWithFallback(
        formData,
        "responsibilitiesSummary",
        { max: 2000 },
        existingBrief?.responsibilitiesSummary ?? "",
      ),
      hiringPriorities,
      atsIntensity: readValueWithFallback(
        formData,
        "atsIntensity",
        { max: 80 },
        existingBrief?.atsIntensity ?? "",
      ),
      technicalIntensity: readValueWithFallback(
        formData,
        "technicalIntensity",
        { max: 80 },
        existingBrief?.technicalIntensity ?? "",
      ),
      recruiterNotes: readValueWithFallback(
        formData,
        "recruiterNotes",
        { max: 2000 },
        existingBrief?.recruiterNotes ?? "",
      ),
    };

    await createJobDescriptionRecord({
      userId: snapshot.user.id,
      jobDescriptionId: jobDescriptionId || snapshot.jobDescriptions[0]?.id,
      company: company || snapshot.jobDescriptions[0]?.company || "Target Company",
      role: role || snapshot.jobDescriptions[0]?.role || "Target Role",
      location,
      description,
      briefData,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step: nextStep ?? currentStep,
        query: {
          jobDescriptionSaved: "1",
          ...(isDraft ? { draft: "1" } : {}),
        },
      }),
    );
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : "Unable to save job description.";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    redirect(
      buildUploadRedirectPath({
        basePath: "/dashboard/upload",
        step,
        query: { error: message },
      }),
    );
  }
}

export async function saveAnalysisAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    requireFeatureAccess(snapshot, "analysis_history");
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", {
      required: true,
      max: 100,
    });

    await saveAnalysisGeneration(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    revalidatePath("/dashboard/analysis");
    redirect(`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&saved=1`);
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save analysis.";
    redirect(`/dashboard/analysis?error=${encodeURIComponent(message)}`);
  }
}

export async function runAnalysisAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });

    if (!hasUsageRemaining(snapshot, "analysis")) {
      redirectForUsageLimit("analysis");
    }

    assertUsageCooldown(snapshot.usage, "analysis");

    await saveAnalysisGeneration(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "analysis",
    });
    trackEvent("analysis_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/analysis");
    redirect(`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&ran=1`);
  } catch (error) {
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to run analysis.";
    redirect(`/dashboard/analysis?error=${encodeURIComponent(message)}`);
  }
}

export async function saveTailoredVersionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    requireFeatureAccess(snapshot, "tailored_resume");
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });
    const customName = readStringField(formData, "customName", { min: 3, max: 120 });

    await createTailoredResumeVersion({
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
      customName,
    }, snapshot);
    trackEvent("tailored_version_saved", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tailoring");
    revalidatePath("/dashboard/versions");
    redirect(`/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&draft=1&saved=1`);
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save tailored version.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function runTailoredDraftAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });

    requireFeatureAccess(snapshot, "tailored_resume");
    assertUsageCooldown(snapshot.usage, "tailored_draft");

    await generateTailoredResumeDraft(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "tailored_draft",
    });
    trackEvent("tailored_draft_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard/tailoring");
    redirect(`/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&draft=1`);
  } catch (error) {
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to generate tailored draft.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function runBulletRewriteAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });
    const bullet = readStringField(formData, "bullet", { required: true, min: 10, max: 500 });
    const mode = assertEnumValue(
      readStringField(formData, "mode", { required: true, max: 40 }),
      ["shorter", "more_technical", "leadership_focused", "tailored_to_jd"] as const,
      "mode",
    ) as RewriteMode;

    if (!hasUsageRemaining(snapshot, "bullet_rewrite")) {
      redirectForUsageLimit("bullet_rewrite");
    }

    assertUsageCooldown(snapshot.usage, "bullet_rewrite");

    await saveBulletRewrite(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
        bullet,
        mode,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "bullet_rewrite",
    });
    trackEvent("rewrite_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
      mode,
    });

    redirect(
      `/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&rewrite=1&mode=${mode}&bullet=${encodeURIComponent(
        bullet,
      )}&rewriteSaved=1`,
    );
  } catch (error) {
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to generate bullet rewrite.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function updateSettingsAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();

    await updateUserSettings({
      userId: snapshot.user.id,
      name: readStringField(formData, "name", { required: true, min: 2, max: 80 }),
      headline: readStringField(formData, "headline", { max: 240 }),
      targetRole: readStringField(formData, "targetRole", { required: true, min: 2, max: 120 }),
      location: readStringField(formData, "location", { max: 120 }),
    });
    trackEvent("settings_updated", { userId: snapshot.user.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    redirect("/dashboard/settings?saved=1");
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save settings.";
    redirect(`/dashboard/settings?error=${encodeURIComponent(message)}`);
  }
}
