import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import type { WorkflowState } from "@/lib/onboarding";

export function WorkflowStepper({
  workflow,
  currentStepId,
  compact = false,
}: {
  workflow: WorkflowState;
  currentStepId?: string;
  compact?: boolean;
}) {
  return (
    <Card className={cn("border-slate-200 bg-white/90 backdrop-blur-sm", compact ? "p-4" : "p-5")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Workflow</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Guided application pipeline
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-600">
          {workflow.completed}/{workflow.total} complete
        </p>
      </div>

      <div className="mt-4">
        <ProgressBar value={workflow.percent} />
      </div>

      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-2" : "lg:grid-cols-3")}>
        {workflow.steps.map((step, index) => {
          const isCurrent = step.id === currentStepId;
          return (
            <Link
              key={step.id}
              className={cn(
                "rounded-2xl border p-4 transition-all",
                step.complete
                  ? "border-emerald-200 bg-emerald-50/60"
                  : isCurrent
                    ? "border-sky-200 bg-sky-50/70 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
              )}
              href={step.href}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    step.complete
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-sky-600 text-white"
                        : "bg-slate-200 text-slate-700",
                  )}
                >
                  {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                    {step.complete ? "Completed" : isCurrent ? "Current step" : "Open"}
                    {!step.complete ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
