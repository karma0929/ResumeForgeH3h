import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, CircleAlert, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { ResumeAnalysis, UILanguage } from "@/lib/types";

function verdict(overall: number, uiLanguage: UILanguage) {
  if (overall >= 85) {
    return {
      label: uiLanguage === "zh" ? "高匹配度" : "Strong match",
      tone: "bg-emerald-50 text-emerald-700",
      description:
        uiLanguage === "zh"
          ? "你的简历已能向招聘方清晰表达该岗位匹配度。"
          : "Your resume is already telling a recruiter the right story for this role.",
    };
  }

  if (overall >= 70) {
    return {
      label: uiLanguage === "zh" ? "潜力不错，仍可收紧" : "Promising, but tighten it",
      tone: "bg-sky-50 text-sky-700",
      description:
        uiLanguage === "zh"
          ? "基础不错，进行针对性修改后可快速提升筛选通过率。"
          : "You have a solid base. Targeted edits should raise screening confidence quickly.",
    };
  }

  return {
    label: uiLanguage === "zh" ? "需要加强定向优化" : "Needs targeting work",
    tone: "bg-amber-50 text-amber-700",
    description:
      uiLanguage === "zh"
        ? "关键词缺口和较弱的 Bullet 可能正在拉低招聘方信心。"
        : "Keyword gaps and weaker bullets are likely dragging down recruiter confidence.",
  };
}

export function ScoreSummary({
  analysis,
  targetLabel,
  compact = false,
  uiLanguage,
}: {
  analysis: ResumeAnalysis;
  targetLabel: string;
  compact?: boolean;
  uiLanguage?: UILanguage;
}) {
  const language = uiLanguage ?? "en";
  const summary = verdict(analysis.overall, language);
  const items = [
    {
      label: language === "zh" ? "ATS 就绪度" : "ATS Readiness",
      value: analysis.atsReadiness,
      icon: ScanSearch,
    },
    {
      label: language === "zh" ? "清晰度" : "Clarity",
      value: analysis.clarity,
      icon: CheckCircle2,
    },
    {
      label: language === "zh" ? "影响力" : "Impact",
      value: analysis.impact,
      icon: ArrowUpRight,
    },
    {
      label: language === "zh" ? "岗位匹配" : "Job Fit",
      value: analysis.jobFit,
      icon: BriefcaseBusiness,
    },
  ];

  if (compact) {
    return (
      <Card className="overflow-hidden bg-slate-950 p-0 text-white">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {language === "zh" ? "评分总览" : "Score Summary"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{analysis.overall}/100</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{targetLabel}</p>
            </div>
            <Badge className={summary.tone}>{summary.label}</Badge>
          </div>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl bg-white/6 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-4 w-4 text-slate-300" />
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{item.label}</p>
                <div className="mt-3">
                  <ProgressBar value={item.value} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-slate-950 p-0 text-white">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-white/10 px-6 py-6 sm:px-8 lg:border-b-0 lg:border-r">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {language === "zh" ? "简历评分" : "Resume Score"}
          </p>
          <div className="mt-5 flex items-end gap-2">
            <h2 className="text-6xl font-semibold tracking-tight">{analysis.overall}</h2>
            <span className="pb-2 text-lg text-slate-400">/100</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge className={summary.tone}>{summary.label}</Badge>
            <span className="inline-flex items-center gap-2 text-sm text-slate-300">
              <CircleAlert className="h-4 w-4" />
              {targetLabel}
            </span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">{summary.description}</p>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-8">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl bg-white/6 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-2 text-slate-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
                <div className="mt-4">
                  <ProgressBar value={item.value} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
