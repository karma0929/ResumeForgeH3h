import type { AppSnapshot, ResumeAnalysis } from "@/lib/types";

export interface AIGuidanceItem {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}

export interface AIGuidanceSummary {
  readinessScore: number;
  recommendations: AIGuidanceItem[];
  strengths: string[];
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getLatestAnalysis(snapshot: AppSnapshot, resumeId?: string, jobDescriptionId?: string) {
  const generation =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        (!resumeId || item.resumeId === resumeId) &&
        (!jobDescriptionId || item.jobDescriptionId === jobDescriptionId),
    ) ?? snapshot.aiGenerations.find((item) => item.type === "ANALYSIS");

  return (generation?.output as ResumeAnalysis | undefined) ?? null;
}

export function getAIGuidanceSummary(snapshot: AppSnapshot): AIGuidanceSummary {
  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];
  const analysis = getLatestAnalysis(snapshot, resume?.id, jobDescription?.id);
  const recommendations: AIGuidanceItem[] = [];
  const strengths: string[] = [];

  if (!resume) {
    recommendations.push({
      id: "add-resume",
      severity: "high",
      title: "Add a base resume profile",
      description:
        "ResumeForge needs your base profile before it can produce reliable ATS or tailoring guidance.",
      actionHref: "/dashboard/upload",
      actionLabel: "Open profile builder",
    });
  }

  if (!jobDescription) {
    recommendations.push({
      id: "add-jd",
      severity: "high",
      title: "Add a target role brief",
      description:
        "Attach one real U.S. job posting so scoring and keyword targeting are specific to your goal.",
      actionHref: "/dashboard/upload",
      actionLabel: "Add target role",
    });
  }

  if (resume) {
    if (resume.profileCompleteness < 60) {
      recommendations.push({
        id: "profile-completeness",
        severity: "medium",
        title: "Profile completeness is still low",
        description:
          "Add summary, skills, and at least one structured experience entry to improve generation quality.",
        actionHref: "/dashboard/upload",
        actionLabel: "Refine profile",
      });
    } else {
      strengths.push("Your base resume profile is structurally complete.");
    }

    const hasSummarySection = resume.parsed.sections.some((section) =>
      /summary|profile/i.test(section.title),
    );
    if (!hasSummarySection) {
      recommendations.push({
        id: "missing-summary",
        severity: "medium",
        title: "No clear professional summary detected",
        description:
          "A short summary helps recruiters quickly map your background to the role before reading details.",
        actionHref: "/dashboard/upload",
        actionLabel: "Add summary",
      });
    }

    const hasQuantifiedImpact = resume.parsed.experienceBullets.some((bullet) => /\d/.test(bullet));
    if (!hasQuantifiedImpact) {
      recommendations.push({
        id: "quantified-impact",
        severity: "medium",
        title: "Quantified impact is missing",
        description:
          "Add metrics such as time saved, conversion lift, or cost reduction to increase recruiter confidence.",
        actionHref: "/dashboard/upload",
        actionLabel: "Add measurable outcomes",
      });
    } else {
      strengths.push("Your experience bullets already include measurable outcomes.");
    }
  }

  if (jobDescription) {
    if (jobDescription.briefCompleteness < 55) {
      recommendations.push({
        id: "brief-completeness",
        severity: "medium",
        title: "Target role brief can be richer",
        description:
          "Add required skills and hiring priorities to improve keyword targeting and rewrite precision.",
        actionHref: "/dashboard/upload",
        actionLabel: "Enhance role brief",
      });
    } else {
      strengths.push("Your target role brief has enough detail for role-specific generation.");
    }
  }

  if (!analysis && resume && jobDescription) {
    recommendations.push({
      id: "run-analysis",
      severity: "high",
      title: "Run ATS analysis before tailoring",
      description:
        "Start with scoring so your rewrites are aligned to gaps in fit, impact, and missing keywords.",
      actionHref: `/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`,
      actionLabel: "Run ATS analysis",
    });
  }

  if (analysis) {
    if (analysis.jobFit < 72) {
      recommendations.push({
        id: "job-fit-gap",
        severity: "high",
        title: "Job-fit score suggests alignment gaps",
        description:
          "Your target role emphasizes different signals. Tailor summary and top bullets to role priorities.",
        actionHref: "/dashboard/tailoring",
        actionLabel: "Open tailoring",
      });
    } else {
      strengths.push("Your current resume shows healthy job-fit alignment.");
    }

    if (analysis.missingKeywords.length >= 6) {
      recommendations.push({
        id: "keyword-gap",
        severity: "medium",
        title: "Keyword coverage is still thin",
        description:
          "Add missing role keywords in summary, skills, and high-impact bullets for stronger ATS matching.",
        actionHref: "/dashboard/analysis",
        actionLabel: "Review keyword gaps",
      });
    }
  }

  const scoredSignals = [
    resume ? Math.min(100, resume.profileCompleteness) : 0,
    jobDescription ? Math.min(100, jobDescription.briefCompleteness) : 0,
    analysis ? analysis.overall : 0,
  ];
  const readinessScore = clamp(scoredSignals.reduce((sum, value) => sum + value, 0) / scoredSignals.length);

  return {
    readinessScore,
    recommendations: recommendations.slice(0, 5),
    strengths: strengths.slice(0, 3),
  };
}
