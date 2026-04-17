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
import type { RewriteMode } from "@/lib/types";

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

export async function saveResumeAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const title = readStringField(formData, "title", { required: true, min: 3, max: 120 });
    const originalText = readStringField(formData, "originalText", {
      required: true,
      min: 40,
      max: 15000,
    });

    await createResumeRecord({
      userId: snapshot.user.id,
      title,
      originalText,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    redirect("/dashboard/upload?resumeSaved=1");
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : "Unable to save resume.";
    redirect(`/dashboard/upload?error=${encodeURIComponent(message)}`);
  }
}

export async function saveJobDescriptionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const company = readStringField(formData, "company", { required: true, min: 2, max: 120 });
    const role = readStringField(formData, "role", { required: true, min: 2, max: 120 });
    const location = readStringField(formData, "location", { max: 120 });
    const description = readStringField(formData, "description", {
      required: true,
      min: 80,
      max: 20000,
    });

    await createJobDescriptionRecord({
      userId: snapshot.user.id,
      company,
      role,
      location,
      description,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    redirect("/dashboard/upload?jobDescriptionSaved=1");
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
