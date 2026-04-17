import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { OnboardingStep } from "@/lib/onboarding";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export function OnboardingFlow({
  steps,
  completed,
  total,
  percent,
  compact = false,
}: {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "p-4" : undefined}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Getting started</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {compact ? "Onboarding progress" : "First-time setup checklist"}
          </h2>
        </div>
        <div className="text-sm font-medium text-slate-600">
          {completed}/{total} complete
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar value={percent} />
      </div>
      <div className={`mt-5 grid gap-3 ${compact ? "" : "lg:grid-cols-2"}`}>
        {steps.map((step, index) => (
          <Link
            key={step.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-white"
            href={step.href}
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
                {!step.complete ? (
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
