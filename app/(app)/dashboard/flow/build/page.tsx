import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getJourneyState } from "@/lib/journey";

export default async function BuildFlowPage() {
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const journey = getJourneyState(snapshot);

  const steps = [
    {
      title: "Define target role",
      description: "Set the role context first so your profile is built toward a concrete target.",
      complete: journey.signals.hasTargetRole,
      href: "/dashboard/upload?step=1",
    },
    {
      title: "Build core profile",
      description: "Add summary, skills, experience, education, and projects in guided form.",
      complete: journey.signals.hasCoreProfile,
      href: "/dashboard/upload?step=3",
    },
    {
      title: "Add optional enhancements",
      description: "Include quantified outcomes, links, and style preferences for stronger matching.",
      complete: journey.signals.hasEnhancements,
      href: "/dashboard/upload?step=4",
    },
    {
      title: "Run ATS and fit analysis",
      description: "Validate baseline quality and role alignment before tailoring.",
      complete: journey.signals.hasAnalysis,
      href: journey.analysisHref,
    },
    {
      title: "Generate tailored version and export",
      description: "Create a role-specific draft, compare versions, and export when ready.",
      complete: journey.signals.hasTailored,
      href: journey.tailoringHref,
    },
  ];

  const currentStep = steps.findIndex((step) => !step.complete);
  const activeStep = currentStep === -1 ? steps.length - 1 : currentStep;

  return (
    <div className="space-y-7">
      <DashboardHeader
        action={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to start
          </Link>
        }
        description="Use this path when you need to build a stronger resume foundation before tailoring to specific roles."
        title="Build From Scratch"
      />

      <Card className="border-slate-200 bg-white/92 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Path progress</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {journey.build.completed}/{journey.build.total} complete
            </h2>
          </div>
          <Badge className="bg-white text-slate-700">{journey.build.percent}% complete</Badge>
        </div>
        <div className="mt-4">
          <ProgressBar value={journey.build.percent} />
        </div>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
          href={journey.build.nextHref}
        >
          Continue this path
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <Card className="border-slate-200 bg-white/92 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Step sequence</p>
        <div className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <div
              className={`rounded-2xl border p-4 ${
                step.complete
                  ? "border-emerald-200 bg-emerald-50/60"
                  : index === activeStep
                    ? "border-sky-200 bg-sky-50/60"
                    : "border-slate-200 bg-slate-50"
              }`}
              key={step.title}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {step.complete ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </div>
                <Link className="text-sm font-medium text-slate-700 underline" href={step.href}>
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 bg-slate-50/80 p-5">
        <p className="text-sm text-slate-600">
          Already have a baseline resume? Switch to{" "}
          <Link className="font-medium text-slate-900 underline" href="/dashboard/flow/improve">
            Improve existing resume
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
