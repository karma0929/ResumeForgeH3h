import Link from "next/link";
import { ArrowRight, Gauge, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getUsageUpgradePrompt, type UsageAction } from "@/lib/usage";

const icons: Record<UsageAction, LucideIcon> = {
  analysis: Gauge,
  bullet_rewrite: Gauge,
  tailored_draft: Gauge,
};

export function UsageLimitPrompt({
  action,
  compact = false,
}: {
  action: UsageAction;
  compact?: boolean;
}) {
  const prompt = getUsageUpgradePrompt(action);
  const Icon = icons[action];

  return (
    <Card className={compact ? "p-5" : "border-slate-900 bg-slate-950 text-white"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className={`rounded-2xl p-3 ${compact ? "bg-slate-100 text-slate-800" : "bg-white/10 text-white"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${compact ? "text-slate-950" : "text-white"}`}>
              {prompt.title}
            </h3>
            <p className={`mt-2 text-sm leading-7 ${compact ? "text-slate-600" : "text-slate-300"}`}>
              {prompt.description}
            </p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${compact ? "bg-slate-100 text-slate-700" : "bg-white/10 text-slate-200"}`}>
          Pro
        </div>
      </div>
      <div className="mt-5">
        <Link
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium ${
            compact ? "bg-slate-900 text-white" : "bg-white text-slate-900"
          }`}
          href={`/dashboard/billing?usageLimit=${action}&blocked=1&targetPlan=${prompt.targetPlan}`}
        >
          {prompt.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
