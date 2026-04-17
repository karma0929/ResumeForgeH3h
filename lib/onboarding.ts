import type { AppSnapshot } from "@/lib/types";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  complete: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

export function getOnboardingSteps(snapshot: AppSnapshot): OnboardingStep[] {
  const hasAnalysis = snapshot.usage.analysesUsed > 0;
  const hasTailoredVersion = snapshot.resumeVersions.some((version) => version.type === "TAILORED");

  return [
    {
      id: "resume",
      title: "Add your base resume",
      description: "Upload the resume you are currently sending to U.S. employers.",
      href: "/dashboard/upload",
      complete: snapshot.resumes.length > 0,
    },
    {
      id: "job-description",
      title: "Paste a target job description",
      description: "Store a real U.S. job posting so ResumeForge can measure fit and missing signals.",
      href: "/dashboard/upload",
      complete: snapshot.jobDescriptions.length > 0,
    },
    {
      id: "analysis",
      title: "Run your first ATS analysis",
      description: "Get one scorecard for clarity, impact, ATS readiness, and job fit.",
      href: "/dashboard/analysis",
      complete: hasAnalysis,
    },
    {
      id: "tailored",
      title: "Generate a tailored version",
      description: "Create a role-specific draft you can compare and export.",
      href: "/dashboard/tailoring",
      complete: hasTailoredVersion,
    },
  ];
}

export function getOnboardingProgress(snapshot: AppSnapshot): OnboardingProgress {
  const steps = getOnboardingSteps(snapshot);
  const completed = steps.filter((step) => step.complete).length;
  const total = steps.length;

  return {
    steps,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    isComplete: completed === total,
  };
}
