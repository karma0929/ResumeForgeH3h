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

export async function saveResumeAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const intakeMode = assertEnumValue(
      readStringField(formData, "intakeMode", { max: 20, fallback: "quick" }),
      ["quick", "guided"] as const,
      "intakeMode",
    ) as ResumeIntakeMode;
    const resumeId = readStringField(formData, "resumeId", { max: 120 });
    const titleInput = readStringField(formData, "title", { max: 120 });
    const title = titleInput || (intakeMode === "guided" ? "Guided Resume Draft" : "Resume Draft");

    if (!isDraft && title.length < 3) {
      throw new ValidationError("title must be at least 3 characters.");
    }

    const quickResumeText = readStringField(formData, "quickResumeText", { max: 15000 });

    if (!isDraft && intakeMode === "quick" && quickResumeText.length < 40) {
      throw new ValidationError("quickResumeText must be at least 40 characters.");
    }

    const careerLevel = readStringField(formData, "careerLevel", { max: 40 }) as CareerLevel | "";
    const experienceEntries = [1, 2].map((index) => ({
      company: readStringField(formData, `exp${index}_company`, { max: 120 }),
      title: readStringField(formData, `exp${index}_title`, { max: 120 }),
      location: readStringField(formData, `exp${index}_location`, { max: 120 }),
      dates: readStringField(formData, `exp${index}_dates`, { max: 80 }),
      responsibilities: readStringField(formData, `exp${index}_responsibilities`, { max: 800 }),
      achievements: readStringField(formData, `exp${index}_achievements`, { max: 800 }),
      quantifiedImpact: readStringField(formData, `exp${index}_quantifiedImpact`, { max: 500 }),
    }));

    const profileData: ResumeProfileData = {
      mode: intakeMode,
      basicProfile: {
        fullName: readStringField(formData, "fullName", { max: 120 }),
        currentTitle: readStringField(formData, "currentTitle", { max: 120 }),
        targetTitle: readStringField(formData, "targetTitle", { max: 120 }),
        location: readStringField(formData, "profileLocation", { max: 120 }),
        workAuthorization: readStringField(formData, "workAuthorization", { max: 120 }),
        yearsExperience: readStringField(formData, "yearsExperience", { max: 40 }),
        careerLevel,
      },
      professionalSummary: readStringField(formData, "professionalSummary", { max: 2000 }),
      skills: readCsv(formData, "skillsCsv", 3000),
      workExperiences: experienceEntries.filter((entry) => Object.values(entry).some(Boolean)),
      education: readLines(formData, "educationLines", 3000),
      projects: readLines(formData, "projectLines", 3000),
      certifications: readLines(formData, "certificationLines", 2000),
      awards: readLines(formData, "awardLines", 2000),
      links: {
        linkedIn: readStringField(formData, "linkedInUrl", { max: 240 }),
        github: readStringField(formData, "githubUrl", { max: 240 }),
        portfolio: readStringField(formData, "portfolioUrl", { max: 240 }),
      },
      preferences: {
        resumeStyle: readStringField(formData, "resumeStyle", { max: 120 }),
        keywordEmphasis: readStringField(formData, "keywordEmphasis", { max: 400 }),
        industryPreference: readStringField(formData, "industryPreference", { max: 240 }),
      },
      notes: readStringField(formData, "resumeNotes", { max: 2000 }),
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
    redirect(`/dashboard/upload?resumeSaved=1${isDraft ? "&draft=1" : ""}`);
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save resume.";
    redirect(`/dashboard/upload?error=${encodeURIComponent(message)}`);
  }
}

export async function saveJobDescriptionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { max: 120 });
    const company = readStringField(formData, "company", { max: 120 });
    const role = readStringField(formData, "role", { max: 120 });
    const location = readStringField(formData, "location", { max: 120 });
    const description = readStringField(formData, "description", { max: 20000 });

    if (!isDraft && company.length < 2) {
      throw new ValidationError("company must be at least 2 characters.");
    }

    if (!isDraft && role.length < 2) {
      throw new ValidationError("role must be at least 2 characters.");
    }

    if (!isDraft && description.length < 80) {
      throw new ValidationError("description must be at least 80 characters.");
    }

    const priorityValues = formData
      .getAll("hiringPriorities")
      .map((value) => (typeof value === "string" ? value : ""))
      .filter(Boolean);
    const hiringPriorities = priorityValues.filter((value): value is TargetRoleBriefData["hiringPriorities"][number] =>
      [
        "technical_depth",
        "communication",
        "leadership",
        "execution",
        "research",
        "product_thinking",
      ].includes(value),
    );

    const briefData: TargetRoleBriefData = {
      seniorityLevel: readStringField(formData, "seniorityLevel", { max: 120 }),
      employmentType: readStringField(formData, "employmentType", { max: 120 }),
      workMode: readStringField(formData, "workMode", { max: 120 }),
      industryDomain: readStringField(formData, "industryDomain", { max: 240 }),
      salaryRange: readStringField(formData, "salaryRange", { max: 120 }),
      topRequiredSkills: readCsv(formData, "topRequiredSkills", 2500),
      preferredSkills: readCsv(formData, "preferredSkills", 2500),
      emphasizeKeywords: readCsv(formData, "emphasizeKeywords", 2500),
      responsibilitiesSummary: readStringField(formData, "responsibilitiesSummary", { max: 2000 }),
      hiringPriorities,
      atsIntensity: readStringField(formData, "atsIntensity", { max: 80 }),
      technicalIntensity: readStringField(formData, "technicalIntensity", { max: 80 }),
      recruiterNotes: readStringField(formData, "recruiterNotes", { max: 2000 }),
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
    redirect(`/dashboard/upload?jobDescriptionSaved=1${isDraft ? "&draft=1" : ""}`);
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : "Unable to save job description.";
    redirect(`/dashboard/upload?error=${encodeURIComponent(message)}`);
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
