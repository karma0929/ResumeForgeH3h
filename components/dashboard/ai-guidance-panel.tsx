import Link from "next/link";
import { ArrowRight, BrainCircuit, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import type { AIGuidanceSummary } from "@/lib/ai-guidance";

const severityStyles = {
  high: "border-rose-200 bg-rose-50/70 text-rose-900",
  medium: "border-amber-200 bg-amber-50/70 text-amber-900",
  low: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
} as const;

export function AIGuidancePanel({
  guidance,
  compact = false,
}: {
  guidance: AIGuidanceSummary;
  compact?: boolean;
}) {
  return (
    <Card className="border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AI Guidance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Tailoring readiness
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Heuristic recommendations based on your profile quality, target role detail, and current fit signals.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Readiness</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {guidance.readinessScore}/100
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={guidance.readinessScore} />
      </div>

      <div className={cn("mt-5 grid gap-4", compact ? "" : "xl:grid-cols-[1.05fr_0.95fr]")}>
        <div className="space-y-3">
          {guidance.recommendations.length > 0 ? (
            guidance.recommendations.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl border p-4",
                  severityStyles[item.severity],
                )}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-90">{item.description}</p>
                <Link
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                  href={item.actionHref}
                >
                  {item.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
              <p className="text-sm font-semibold">Profile quality is in a strong place</p>
              <p className="mt-2 text-sm leading-6">
                Continue iterating tailored versions and compare exports before applying.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-sky-700" />
              What is already working
            </p>
            <div className="mt-3 space-y-2">
              {guidance.strengths.length > 0 ? (
                guidance.strengths.map((item) => (
                  <p key={item} className="text-sm leading-6 text-slate-700">
                    • {item}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Add more profile and role detail to unlock stronger signal detection.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BrainCircuit className="h-4 w-4 text-slate-700" />
              Coach tip
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              High-performing resumes usually combine role keywords with measurable outcomes.
              Before export, ensure your strongest two bullets include both.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
