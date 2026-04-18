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

export interface WorkflowStep {
  id: "resume" | "job-description" | "analysis" | "tailored" | "versions" | "export";
  title: string;
  description: string;
  href: string;
  complete: boolean;
}

export interface WorkflowState {
  steps: WorkflowStep[];
  completed: number;
  total: number;
  percent: number;
  nextStep: WorkflowStep | null;
}

export interface WorkflowAction {
  title: string;
  description: string;
  href: string;
  cta: string;
}

export function getWorkflowState(snapshot: AppSnapshot): WorkflowState {
  const hasResumeProfile = snapshot.resumes.some(
    (resume) => resume.profileCompleteness >= 45 || resume.originalText.length >= 120,
  );
  const hasTargetRole = snapshot.jobDescriptions.some(
    (jobDescription) => jobDescription.briefCompleteness >= 40 || jobDescription.description.length >= 120,
  );
  const hasAnalysis = snapshot.aiGenerations.some((generation) => generation.type === "ANALYSIS");
  const hasTailoredVersion = snapshot.resumeVersions.some((version) => version.type === "TAILORED");
  const hasVersionComparisonData = snapshot.resumeVersions.length >= 2;
  const hasExportCapability =
    snapshot.resumeVersions.length > 0 && (snapshot.subscription?.plan ?? "FREE") !== "FREE";

  const steps: WorkflowStep[] = [
    {
      id: "resume",
      title: "Build resume profile",
      description: "Create or refine your base resume profile.",
      href: "/dashboard/upload",
      complete: hasResumeProfile,
    },
    {
      id: "job-description",
      title: "Add target role",
      description: "Create a target role brief from a real job posting.",
      href: "/dashboard/upload",
      complete: hasTargetRole,
    },
    {
      id: "analysis",
      title: "Run ATS analysis",
      description: "Score fit, clarity, impact, and missing keywords.",
      href: "/dashboard/analysis",
      complete: hasAnalysis,
    },
    {
      id: "tailored",
      title: "Generate tailored resume",
      description: "Produce a role-specific version from your analysis signals.",
      href: "/dashboard/tailoring",
      complete: hasTailoredVersion,
    },
    {
      id: "versions",
      title: "Compare versions",
      description: "Review differences between baseline and tailored outputs.",
      href: "/dashboard/versions",
      complete: hasVersionComparisonData,
    },
    {
      id: "export",
      title: "Export for submission",
      description: "Export the best version and submit with confidence.",
      href: "/dashboard/versions",
      complete: hasExportCapability,
    },
  ];

  const completed = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) ?? null;

  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    nextStep,
  };
}

export function getWorkflowAction(snapshot: AppSnapshot): WorkflowAction {
  const workflow = getWorkflowState(snapshot);
  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];

  if (!workflow.nextStep) {
    return {
      title: "Launch-ready application kit",
      description:
        "Your workflow is complete. Compare final versions and export the strongest resume for this role.",
      href: "/dashboard/versions",
      cta: "Review final versions",
    };
  }

  if (workflow.nextStep.id === "analysis" && resume?.id && jobDescription?.id) {
    return {
      title: "Run your first ATS fit scan",
      description:
        "Use your saved profile and target role to generate fit insights before rewriting or tailoring.",
      href: `/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`,
      cta: "Open analysis",
    };
  }

  if (workflow.nextStep.id === "tailored" && resume?.id && jobDescription?.id) {
    return {
      title: "Generate a tailored draft",
      description:
        "Turn your score insights into a role-specific version and save it for side-by-side comparison.",
      href: `/dashboard/tailoring?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`,
      cta: "Open tailoring",
    };
  }

  if (workflow.nextStep.id === "versions") {
    return {
      title: "Compare baseline vs tailored",
      description:
        "Review differences in positioning, keyword coverage, and impact language before export.",
      href: "/dashboard/versions",
      cta: "Compare versions",
    };
  }

  if (workflow.nextStep.id === "export") {
    return {
      title: "Export your strongest version",
      description:
        "You are one step away from submission. Export the selected resume and apply.",
      href: "/dashboard/versions",
      cta: "Open export",
    };
  }

  return {
    title: workflow.nextStep.title,
    description: workflow.nextStep.description,
    href: workflow.nextStep.href,
    cta: "Continue",
  };
}

export function getOnboardingSteps(snapshot: AppSnapshot): OnboardingStep[] {
  return getWorkflowState(snapshot).steps.slice(0, 4).map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    href: step.href,
    complete: step.complete,
  }));
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
