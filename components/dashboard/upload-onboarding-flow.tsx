"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBanner } from "@/components/ui/status-banner";
import type { OnboardingStep } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type StepId = "resume" | "job-description" | "analysis" | "tailored";

function scrollAndFocus(sectionId: string, focusId: string) {
  const section = document.getElementById(sectionId);
  const input = document.getElementById(focusId);

  section?.scrollIntoView({ behavior: "smooth", block: "start" });

  window.setTimeout(() => {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      input.select();
    }
  }, 220);
}

export function UploadOnboardingFlow({
  steps,
  completed,
  total,
  percent,
  resumeId,
  jobDescriptionId,
  hasResume,
  hasJobDescription,
}: {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  resumeId?: string;
  jobDescriptionId?: string;
  hasResume: boolean;
  hasJobDescription: boolean;
}) {
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    title: string;
    description: string;
    tone: "info" | "warning" | "success";
  } | null>(null);

  function openWorkspace(step: StepId) {
    const basePath = step === "analysis" ? "/dashboard/analysis" : "/dashboard/tailoring";
    const params = new URLSearchParams();

    if (resumeId) {
      params.set("resumeId", resumeId);
    }

    if (jobDescriptionId) {
      params.set("jobDescriptionId", jobDescriptionId);
    }

    const target = params.size > 0 ? `${basePath}?${params.toString()}` : basePath;
    setPendingStepId(step);
    window.location.assign(target);
  }

  function handleStep(stepId: StepId) {
    setBanner(null);
    setPendingStepId(null);

    if (stepId === "resume") {
      scrollAndFocus("resume-intake", "resume-title-input");
      setBanner({
        tone: "info",
        title: "Resume form ready",
        description: "Fill in the base resume fields below, then save to continue.",
      });
      return;
    }

    if (stepId === "job-description") {
      scrollAndFocus("job-description-intake", "job-company-input");
      setBanner({
        tone: "info",
        title: "Job description form ready",
        description: "Paste a real target role so analysis and tailoring can use the right signals.",
      });
      return;
    }

    if (!hasResume) {
      scrollAndFocus("resume-intake", "resume-title-input");
      setBanner({
        tone: "warning",
        title: "Resume is required first",
        description: "Save your base resume before running analysis or generating a tailored version.",
      });
      return;
    }

    if (!hasJobDescription) {
      scrollAndFocus("job-description-intake", "job-company-input");
      setBanner({
        tone: "warning",
        title: "Job description is required first",
        description: "Save one target job description before moving to analysis or tailoring.",
      });
      return;
    }

    openWorkspace(stepId);
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Getting started</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Onboarding progress
          </h2>
        </div>
        <div className="text-sm font-medium text-slate-600">
          {completed}/{total} complete
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={percent} />
      </div>

      {banner ? (
        <StatusBanner
          className="mt-4"
          description={banner.description}
          title={banner.title}
          tone={banner.tone}
        />
      ) : null}

      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => {
          const stepId = step.id as StepId;
          const isPending = pendingStepId === step.id;

          return (
            <button
              key={step.id}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                step.complete
                  ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
              )}
              onClick={() => handleStep(stepId)}
              type="button"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 text-slate-700">
                  {step.complete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening workspace...
                      </>
                    ) : (
                      <>
                        {step.complete
                          ? "Review this step"
                          : step.id === "analysis" || step.id === "tailored"
                            ? "Open workspace"
                            : "Open form"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
