"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CircleCheck,
  CircleDashed,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  regenerateAnalysisSuggestionAction,
  runAnalysisAction,
  saveResumeAction,
} from "@/lib/actions/dashboard";
import { pickText } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ResumeAnalysis, ResumeIntakeMode, UILanguage } from "@/lib/types";

export interface AnalysisWorkspaceIssue {
  id: string;
  section: string;
  sectionLabel: string;
  title: string;
  severity: "high" | "medium" | "low";
  fieldName: "professionalSummary" | "skillsCsv" | "exp1_achievements" | "projectLines";
  original: string;
  aiSuggestion: string;
  placeholder: string;
  helper: string;
  problem: string;
  whyItMatters: string;
  detected: string;
  recommendedDirection: string;
}

type IssueProgress = "unresolved" | "in_progress" | "resolved";
type SuggestionMode = "role_aligned" | "concise" | "technical" | "impact_focused";

const severityStyles: Record<AnalysisWorkspaceIssue["severity"], string> = {
  high: "border-rose-400/45 bg-rose-950/20 text-rose-100",
  medium: "border-amber-400/45 bg-amber-950/20 text-amber-100",
  low: "border-emerald-400/45 bg-emerald-950/20 text-emerald-100",
};

function verdict(overall: number, uiLanguage: UILanguage) {
  if (overall >= 84) {
    return {
      label: pickText(uiLanguage, "Closer to target", "接近目标"),
      note: pickText(
        uiLanguage,
        "Strong baseline. Prioritize one or two targeted revisions before export.",
        "基础状态较好，建议修复 1-2 个关键问题后再导出。",
      ),
      tone: "border-emerald-400/45 bg-emerald-950/25 text-emerald-100",
    };
  }
  if (overall >= 72) {
    return {
      label: pickText(uiLanguage, "Needs revision", "需要修订"),
      note: pickText(
        uiLanguage,
        "Credible draft, but top blockers should be fixed before applying.",
        "草稿可用，但建议先处理关键阻塞项再投递。",
      ),
      tone: "border-amber-400/45 bg-amber-950/25 text-amber-100",
    };
  }
  return {
    label: pickText(uiLanguage, "High risk", "高风险"),
    note: pickText(
      uiLanguage,
      "Alignment and impact signals are weak. Fix top blockers first.",
      "对齐度与成果信号偏弱，请先修复高优先级问题。",
    ),
    tone: "border-rose-400/45 bg-rose-950/25 text-rose-100",
  };
}

export function AnalysisWorkspaceClient({
  uiLanguage,
  analysis,
  analysisTimestamp,
  resumeId,
  resumeTitle,
  resumeIntakeMode,
  jobDescriptionId,
  targetLabel,
  resumeOptions,
  jobOptions,
  issues,
  initialIssueId,
  recentResolvedIssueId,
  canRunAnalysis,
}: {
  uiLanguage: UILanguage;
  analysis: ResumeAnalysis;
  analysisTimestamp: string | null;
  resumeId: string;
  resumeTitle: string;
  resumeIntakeMode: ResumeIntakeMode;
  jobDescriptionId: string;
  targetLabel: string;
  resumeOptions: Array<{ id: string; label: string }>;
  jobOptions: Array<{ id: string; label: string }>;
  issues: AnalysisWorkspaceIssue[];
  initialIssueId?: string;
  recentResolvedIssueId?: string;
  canRunAnalysis: boolean;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const router = useRouter();
  const [selectedResumeId, setSelectedResumeId] = useState(resumeId);
  const [selectedJobId, setSelectedJobId] = useState(jobDescriptionId);
  const [selectedIssueId, setSelectedIssueId] = useState(initialIssueId ?? issues[0]?.id ?? "");
  const [issueList, setIssueList] = useState(issues);
  const [issueProgress, setIssueProgress] = useState<Record<string, IssueProgress>>(() => {
    if (!recentResolvedIssueId) {
      return {};
    }
    return { [recentResolvedIssueId]: "resolved" };
  });
  const [regenMode, setRegenMode] = useState<SuggestionMode>("role_aligned");
  const [regenError, setRegenError] = useState<string | null>(null);
  const [regenPending, startRegen] = useTransition();

  const selectedIssue = useMemo(() => {
    return issueList.find((item) => item.id === selectedIssueId) ?? issueList[0];
  }, [issueList, selectedIssueId]);

  const summaryVerdict = verdict(analysis.overall, uiLanguage);
  const timestampLabel = analysisTimestamp
    ? new Intl.DateTimeFormat(uiLanguage === "zh" ? "zh-CN" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(analysisTimestamp))
    : t("Unknown", "未知");

  const metricItems = [
    { label: "ATS", value: analysis.atsReadiness },
    { label: t("Clarity", "清晰度"), value: analysis.clarity },
    { label: t("Impact", "影响力"), value: analysis.impact },
    { label: t("Job Fit", "岗位匹配"), value: analysis.jobFit },
  ];

  function markIssueStatus(id: string, status: IssueProgress) {
    setIssueProgress((prev) => ({ ...prev, [id]: status }));
  }

  function onSwitchContext() {
    router.replace(`/dashboard/analysis?resumeId=${selectedResumeId}&jobDescriptionId=${selectedJobId}`);
  }

  async function regenerateSuggestion() {
    if (!selectedIssue) return;

    setRegenError(null);
    startRegen(async () => {
      const formData = new FormData();
      formData.append("resumeId", selectedResumeId);
      formData.append("jobDescriptionId", selectedJobId);
      formData.append("sourceText", selectedIssue.original || selectedIssue.aiSuggestion);
      formData.append("mode", regenMode);

      const result = await regenerateAnalysisSuggestionAction(formData);
      if (!result.success) {
        setRegenError(result.error);
        return;
      }

      setIssueList((prev) =>
        prev.map((issue) =>
          issue.id === selectedIssue.id ? { ...issue, aiSuggestion: result.suggestion } : issue,
        ),
      );
      markIssueStatus(selectedIssue.id, "in_progress");
    });
  }

  if (!selectedIssue) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="rf-surface-strong rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              {t("Analysis context", "分析上下文")}
            </p>
            <p className="text-lg font-semibold text-slate-50">{resumeOptions.find((item) => item.id === selectedResumeId)?.label ?? resumeTitle}</p>
            <p className="text-sm text-slate-300">{targetLabel}</p>
            <p className="text-xs text-slate-400">
              {t("Updated", "更新时间")} · {timestampLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={summaryVerdict.tone}>{summaryVerdict.label}</Badge>
            <p className="text-3xl font-semibold tracking-tight text-slate-50">{analysis.overall}<span className="ml-1 text-sm text-slate-400">/100</span></p>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-300">{summaryVerdict.note}</p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_auto_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {t("Resume", "简历")}
            </span>
            <select
              className="w-full rounded-2xl border px-3 py-2 text-sm"
              onChange={(event) => setSelectedResumeId(event.target.value)}
              value={selectedResumeId}
            >
              {resumeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {t("Target role", "目标岗位")}
            </span>
            <select
              className="w-full rounded-2xl border px-3 py-2 text-sm"
              onChange={(event) => setSelectedJobId(event.target.value)}
              value={selectedJobId}
            >
              {jobOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-500/45 bg-slate-900/72 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/82"
            onClick={onSwitchContext}
            type="button"
          >
            {t("Switch context", "切换上下文")}
          </button>

          {canRunAnalysis ? (
            <form action={runAnalysisAction}>
              <input name="resumeId" type="hidden" value={selectedResumeId} />
              <input name="jobDescriptionId" type="hidden" value={selectedJobId} />
              <SubmitButton pendingLabel={t("Running...", "分析中...")}>
                {t("Re-run analysis", "重新分析")}
              </SubmitButton>
            </form>
          ) : (
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 px-4 text-sm font-medium text-white"
              href="/dashboard/billing?usageLimit=analysis&blocked=1"
            >
              {t("Upgrade", "升级")}
            </a>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {metricItems.map((metric) => (
            <div key={metric.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                <span>{metric.label}</span>
                <span>{metric.value}</span>
              </div>
              <ProgressBar value={metric.value} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <div className="rf-surface rounded-2xl p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Issue queue", "问题队列")}</p>
            <div className="mt-3 divide-y divide-slate-700/50">
              {issueList.map((issue, index) => {
                const active = issue.id === selectedIssue.id;
                const progress = issueProgress[issue.id] ?? "unresolved";
                const progressLabel =
                  progress === "resolved"
                    ? t("resolved", "已解决")
                    : progress === "in_progress"
                      ? t("in progress", "处理中")
                      : t("unresolved", "未解决");

                return (
                  <button
                    className={`w-full px-2 py-3 text-left transition ${active ? "rounded-xl bg-cyan-950/25" : "hover:bg-slate-900/70"}`}
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">{index + 1}. {issue.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityStyles[issue.severity]}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{issue.sectionLabel}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {progress === "resolved" ? (
                          <CircleCheck className="h-3.5 w-3.5 text-emerald-300" />
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {progressLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="xl:col-span-4">
          <div className="rf-surface rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Diagnosis", "诊断说明")}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-50">{selectedIssue.title}</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
              <div>
                <p className="font-medium text-slate-100">{t("Problem", "问题")}</p>
                <p className="mt-1">{selectedIssue.problem}</p>
              </div>
              <div>
                <p className="font-medium text-slate-100">{t("Why it matters", "为什么重要")}</p>
                <p className="mt-1">{selectedIssue.whyItMatters}</p>
              </div>
              <div>
                <p className="font-medium text-slate-100">{t("What we detected", "检测依据")}</p>
                <p className="mt-1">{selectedIssue.detected}</p>
              </div>
              <div>
                <p className="font-medium text-slate-100">{t("Recommended direction", "建议方向")}</p>
                <p className="mt-1">{selectedIssue.recommendedDirection}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5">
          <IssueRevisionPanel
            canRunAnalysis={canRunAnalysis}
            issue={selectedIssue}
            jobDescriptionId={selectedJobId}
            onMarkInProgress={() => markIssueStatus(selectedIssue.id, "in_progress")}
            onMarkResolved={() => markIssueStatus(selectedIssue.id, "resolved")}
            onRegenerate={regenerateSuggestion}
            regenError={regenError}
            regenMode={regenMode}
            regenPending={regenPending}
            resumeId={selectedResumeId}
            resumeIntakeMode={resumeIntakeMode}
            resumeTitle={resumeTitle}
            setRegenMode={setRegenMode}
            uiLanguage={uiLanguage}
          />
        </div>
      </div>
    </section>
  );
}

function IssueRevisionPanel({
  uiLanguage,
  issue,
  resumeId,
  resumeTitle,
  resumeIntakeMode,
  jobDescriptionId,
  regenMode,
  setRegenMode,
  onRegenerate,
  regenPending,
  regenError,
  onMarkInProgress,
  onMarkResolved,
  canRunAnalysis,
}: {
  uiLanguage: UILanguage;
  issue: AnalysisWorkspaceIssue;
  resumeId: string;
  resumeTitle: string;
  resumeIntakeMode: ResumeIntakeMode;
  jobDescriptionId: string;
  regenMode: SuggestionMode;
  setRegenMode: (mode: SuggestionMode) => void;
  onRegenerate: () => void;
  regenPending: boolean;
  regenError: string | null;
  onMarkInProgress: () => void;
  onMarkResolved: () => void;
  canRunAnalysis: boolean;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);

  const modeOptions: Array<{ value: SuggestionMode; label: string }> = [
    { value: "role_aligned", label: t("Role-aligned", "岗位导向") },
    { value: "concise", label: t("Concise", "更简洁") },
    { value: "technical", label: t("Technical", "更技术化") },
    { value: "impact_focused", label: t("Impact-focused", "更结果导向") },
  ];

  return (
    <div className="rf-surface rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("AI suggestion + revision", "AI 建议与修改")}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-50">{t("Current issue optimization zone", "当前问题优化区")}</h3>
      <p className="mt-2 text-sm text-slate-300">{issue.helper}</p>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-slate-600/42 bg-slate-900/72 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{t("Original", "原文")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {issue.original || t("No existing content in this section yet.", "该分段暂无已有内容。")}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/35 bg-cyan-950/22 p-3">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            {t("AI suggestion", "AI 建议")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-cyan-50/95">{issue.aiSuggestion}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modeOptions.map((mode) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              regenMode === mode.value
                ? "border-cyan-300/70 bg-cyan-950/35 text-cyan-100"
                : "border-slate-600/45 bg-slate-900/72 text-slate-200 hover:border-slate-400/65"
            }`}
            key={mode.value}
            onClick={() => setRegenMode(mode.value)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
        <button
          className="ml-auto inline-flex h-9 items-center gap-1 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/85 disabled:opacity-60"
          disabled={regenPending}
          onClick={onRegenerate}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${regenPending ? "animate-spin" : ""}`} />
          {t("Regenerate suggestion", "重新生成建议")}
        </button>
      </div>
      {regenError ? <p className="mt-2 text-sm text-rose-300">{regenError}</p> : null}

      <RevisionEditor
        issue={issue}
        jobDescriptionId={jobDescriptionId}
        onMarkInProgress={onMarkInProgress}
        onMarkResolved={onMarkResolved}
        resumeId={resumeId}
        resumeIntakeMode={resumeIntakeMode}
        resumeTitle={resumeTitle}
        uiLanguage={uiLanguage}
      />

      {canRunAnalysis ? (
        <form action={runAnalysisAction} className="mt-4 rounded-2xl border border-slate-600/42 bg-slate-900/72 p-3">
          <input name="resumeId" type="hidden" value={resumeId} />
          <input name="jobDescriptionId" type="hidden" value={jobDescriptionId} />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-300">
              {t(
                "After important edits, re-run analysis to validate score movement.",
                "完成关键修改后，建议重新分析验证分数变化。",
              )}
            </p>
            <SubmitButton className="ml-auto" pendingLabel={t("Re-analyzing...", "正在重新分析...")} variant="outline">
              {t("Re-check full resume", "重新分析整份简历")}
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function RevisionEditor({
  uiLanguage,
  issue,
  resumeId,
  resumeTitle,
  resumeIntakeMode,
  jobDescriptionId,
  onMarkInProgress,
  onMarkResolved,
}: {
  uiLanguage: UILanguage;
  issue: AnalysisWorkspaceIssue;
  resumeId: string;
  resumeTitle: string;
  resumeIntakeMode: ResumeIntakeMode;
  jobDescriptionId: string;
  onMarkInProgress: () => void;
  onMarkResolved: () => void;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const [draft, setDraft] = useState(issue.aiSuggestion || issue.original);

  return (
    <form
      action={saveResumeAction}
      className="mt-4 space-y-3"
      key={`${issue.id}:${issue.aiSuggestion}`}
    >
      <input
        name="returnTo"
        type="hidden"
        value={`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&issue=${issue.id}`}
      />
      <input name="resumeId" type="hidden" value={resumeId} />
      <input name="title" type="hidden" value={resumeTitle} />
      <input name="intakeMode" type="hidden" value={resumeIntakeMode} />
      <input name="intent" type="hidden" value="draft" />
      <textarea
        className="min-h-[220px] w-full rounded-2xl border px-4 py-3 text-sm leading-7"
        name={issue.fieldName}
        onChange={(event) => {
          setDraft(event.target.value);
          onMarkInProgress();
        }}
        placeholder={issue.placeholder}
        value={draft}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/85"
          onClick={() => {
            setDraft(issue.aiSuggestion);
            onMarkInProgress();
          }}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          {t("Apply AI suggestion", "应用 AI 建议")}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/85"
          onClick={() => {
            setDraft(issue.original);
            onMarkInProgress();
          }}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          {t("Restore original", "恢复原文")}
        </button>
        <SubmitButton className="ml-auto" onClick={onMarkResolved}>
          {t("Save revision", "保存修订")}
        </SubmitButton>
      </div>
    </form>
  );
}
