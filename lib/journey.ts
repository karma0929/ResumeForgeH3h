import type { AppSnapshot } from "@/lib/types";

export interface JourneySignals {
  hasTargetRole: boolean;
  hasResumeBaseline: boolean;
  hasCoreProfile: boolean;
  hasEnhancements: boolean;
  hasAnalysis: boolean;
  hasTailored: boolean;
  hasAnyProgress: boolean;
  resumeId: string | null;
  jobDescriptionId: string | null;
}

export interface JourneyState {
  signals: JourneySignals;
  improve: {
    completed: number;
    total: number;
    percent: number;
    nextHref: string;
    started: boolean;
  };
  build: {
    completed: number;
    total: number;
    percent: number;
    nextHref: string;
    started: boolean;
  };
  analysisHref: string;
  tailoringHref: string;
  recommendedPath: "improve" | "build";
}

function buildAnalysisHref(signals: JourneySignals) {
  if (!signals.resumeId || !signals.jobDescriptionId) {
    return "/dashboard/analysis";
  }

  return `/dashboard/analysis?resumeId=${signals.resumeId}&jobDescriptionId=${signals.jobDescriptionId}`;
}

function buildTailoringHref(signals: JourneySignals) {
  if (!signals.resumeId || !signals.jobDescriptionId) {
    return "/dashboard/tailoring";
  }

  return `/dashboard/tailoring?resumeId=${signals.resumeId}&jobDescriptionId=${signals.jobDescriptionId}`;
}

function getSignals(snapshot: AppSnapshot): JourneySignals {
  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];
  const hasTargetRole = Boolean(
    jobDescription &&
      (jobDescription.briefCompleteness >= 35 || jobDescription.description.length >= 80),
  );
  const hasResumeBaseline = Boolean(resume && resume.originalText.length >= 40);
  const hasCoreProfile = Boolean(resume && resume.profileCompleteness >= 45);
  const hasEnhancements = Boolean(resume && resume.profileCompleteness >= 70);

  const hasAnalysis = snapshot.aiGenerations.some(
    (generation) =>
      generation.type === "ANALYSIS" &&
      (!resume || generation.resumeId === resume.id) &&
      (!jobDescription || generation.jobDescriptionId === jobDescription.id),
  );
  const hasTailored = snapshot.resumeVersions.some(
    (version) =>
      version.type === "TAILORED" &&
      (!resume || version.resumeId === resume.id) &&
      (!jobDescription || version.jobDescriptionId === jobDescription.id),
  );

  return {
    hasTargetRole,
    hasResumeBaseline,
    hasCoreProfile,
    hasEnhancements,
    hasAnalysis,
    hasTailored,
    hasAnyProgress:
      hasTargetRole ||
      hasResumeBaseline ||
      hasCoreProfile ||
      hasEnhancements ||
      hasAnalysis ||
      hasTailored,
    resumeId: resume?.id ?? null,
    jobDescriptionId: jobDescription?.id ?? null,
  };
}

function toPercent(completed: number, total: number) {
  return Math.round((completed / total) * 100);
}

export function getJourneyState(snapshot: AppSnapshot): JourneyState {
  const signals = getSignals(snapshot);
  const analysisHref = buildAnalysisHref(signals);
  const tailoringHref = buildTailoringHref(signals);

  const improveCompleted =
    (signals.hasTargetRole && signals.hasResumeBaseline ? 1 : 0) +
    (signals.hasAnalysis ? 1 : 0) +
    (signals.hasTailored ? 1 : 0);
  const improveTotal = 3;
  const improveNextHref = !signals.hasResumeBaseline
    ? "/dashboard/flow/improve?step=1"
    : !signals.hasTargetRole
      ? "/dashboard/flow/improve?step=2"
      : !signals.hasAnalysis
        ? "/dashboard/flow/improve?step=3"
        : !signals.hasTailored
          ? "/dashboard/flow/improve?step=5"
          : "/dashboard/flow/improve?step=6";

  const buildCompleted =
    (signals.hasTargetRole ? 1 : 0) +
    (signals.hasCoreProfile ? 1 : 0) +
    (signals.hasEnhancements ? 1 : 0) +
    (signals.hasAnalysis ? 1 : 0) +
    (signals.hasTailored ? 1 : 0);
  const buildTotal = 5;
  const buildNextHref = !signals.hasCoreProfile
    ? "/dashboard/flow/build?step=1"
    : !signals.hasTargetRole
      ? "/dashboard/flow/build?step=7"
      : !signals.hasEnhancements
        ? "/dashboard/flow/build?step=6"
        : !signals.hasAnalysis
          ? analysisHref
          : !signals.hasTailored
            ? tailoringHref
            : "/dashboard/flow/build?step=10";

  const improveStarted =
    signals.hasResumeBaseline || signals.hasTargetRole || signals.hasAnalysis || signals.hasTailored;
  const buildStarted =
    signals.hasCoreProfile ||
    signals.hasEnhancements ||
    signals.hasTargetRole ||
    signals.hasAnalysis ||
    signals.hasTailored;

  const recommendedPath = improveStarted ? "improve" : "build";

  return {
    signals,
    improve: {
      completed: improveCompleted,
      total: improveTotal,
      percent: toPercent(improveCompleted, improveTotal),
      nextHref: improveNextHref,
      started: improveStarted,
    },
    build: {
      completed: buildCompleted,
      total: buildTotal,
      percent: toPercent(buildCompleted, buildTotal),
      nextHref: buildNextHref,
      started: buildStarted,
    },
    analysisHref,
    tailoringHref,
    recommendedPath,
  };
}
