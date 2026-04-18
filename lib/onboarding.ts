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
  id: string;
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
  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];
  const hasTargetRole = Boolean(
    jobDescription &&
      (jobDescription.briefCompleteness >= 35 || jobDescription.description.length >= 80),
  );
  const hasResumeBaseline = Boolean(resume && resume.originalText.length >= 40);
  const hasCoreProfile = Boolean(resume && resume.profileCompleteness >= 45);
  const hasEnhancements = Boolean(resume && resume.profileCompleteness >= 70);
  const hasDraft = hasTargetRole && hasResumeBaseline;
  const hasAnalysis = snapshot.aiGenerations.some((generation) => generation.type === "ANALYSIS");
  const hasTailoredVersion = snapshot.resumeVersions.some(
    (version) =>
      version.type === "TAILORED" &&
      (!resume || version.resumeId === resume.id) &&
      (!jobDescription || version.jobDescriptionId === jobDescription.id),
  );

  const steps: WorkflowStep[] = [
    {
      id: "target-role",
      title: "Define target role",
      description: "Capture target company, role context, and hiring signals.",
      href: "/dashboard/upload",
      complete: hasTargetRole,
    },
    {
      id: "resume-baseline",
      title: "Add resume baseline",
      description: "Paste your current resume or start from guided mode.",
      href: "/dashboard/upload",
      complete: hasResumeBaseline,
    },
    {
      id: "core-profile",
      title: "Build core profile",
      description: "Add summary, skills, experience, education, and projects.",
      href: "/dashboard/upload",
      complete: hasCoreProfile,
    },
    {
      id: "enhancements",
      title: "Add enhancements",
      description: "Optional details that improve ATS and generation quality.",
      href: "/dashboard/upload",
      complete: hasEnhancements,
    },
    {
      id: "draft",
      title: "Generate baseline draft",
      description: "Review profile quality and unresolved information gaps.",
      href: "/dashboard/upload",
      complete: hasDraft,
    },
    {
      id: "analysis",
      title: "Run ATS analysis",
      description: "Score fit, clarity, impact, and missing role signals.",
      href: "/dashboard/analysis",
      complete: hasAnalysis,
    },
    {
      id: "tailored",
      title: "Generate tailored version",
      description: "Create a role-specific submission draft.",
      href: "/dashboard/tailoring",
      complete: hasTailoredVersion,
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

  if (workflow.nextStep.id === "target-role") {
    return {
      title: "Start with your target role",
      description:
        "Define the role first so every resume suggestion is aligned to an actual opportunity.",
      href: "/dashboard/upload?step=1",
      cta: "Define target role",
    };
  }

  if (workflow.nextStep.id === "resume-baseline") {
    return {
      title: "Add your current resume baseline",
      description:
        "Paste your existing resume or begin guided mode to build one progressively.",
      href: "/dashboard/upload?step=2",
      cta: "Add resume baseline",
    };
  }

  if (workflow.nextStep.id === "core-profile") {
    return {
      title: "Build your core profile",
      description:
        "Add summary, skills, and core experience so output quality improves before analysis.",
      href: "/dashboard/upload?step=3",
      cta: "Complete core profile",
    };
  }

  if (workflow.nextStep.id === "enhancements") {
    return {
      title: "Add optional enhancements",
      description:
        "Include quantified impact and optional signals to improve ATS and recruiter confidence.",
      href: "/dashboard/upload?step=4",
      cta: "Add enhancements",
    };
  }

  if (workflow.nextStep.id === "draft") {
    return {
      title: "Review draft readiness",
      description:
        "Check profile gaps and confirm readiness before running ATS analysis.",
      href: "/dashboard/upload?step=5",
      cta: "Review readiness",
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
