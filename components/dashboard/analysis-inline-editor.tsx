"use client";

import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAnalysisAction, saveResumeAction } from "@/lib/actions/dashboard";
import { pickText } from "@/lib/i18n";
import type { ResumeIntakeMode, UILanguage } from "@/lib/types";

export interface AnalysisEditorIssue {
  id: string;
  section: string;
  title: string;
  fieldName: "professionalSummary" | "skillsCsv" | "exp1_achievements" | "projectLines";
  original: string;
  aiSuggestion: string;
  placeholder: string;
  helper: string;
}

export function AnalysisInlineEditor({
  uiLanguage,
  issue,
  resumeId,
  resumeTitle,
  intakeMode,
  jobDescriptionId,
}: {
  uiLanguage: UILanguage;
  issue: AnalysisEditorIssue;
  resumeId: string;
  resumeTitle: string;
  intakeMode: ResumeIntakeMode;
  jobDescriptionId: string;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const [draft, setDraft] = useState(issue.aiSuggestion || issue.original);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
          {t("Live revision editor", "实时修订编辑器")}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-50">{issue.title}</h3>
        <p className="mt-2 text-sm text-slate-300">{issue.helper}</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-600/45 bg-slate-900/66 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {t("Original content", "原始内容")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {issue.original || t("No existing content in this section yet.", "该分段暂无已有内容。")}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/35 bg-cyan-950/20 p-3">
          <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            {t("AI suggestion", "AI 建议版本")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-cyan-50/95">
            {issue.aiSuggestion}
          </p>
        </div>
      </div>

      <form action={saveResumeAction} className="space-y-3">
        <input name="returnTo" type="hidden" value={`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&issue=${issue.id}`} />
        <input name="resumeId" type="hidden" value={resumeId} />
        <input name="title" type="hidden" value={resumeTitle} />
        <input name="intakeMode" type="hidden" value={intakeMode} />
        <input name="intent" type="hidden" value="draft" />
        <textarea
          className="min-h-[200px] w-full rounded-2xl border px-4 py-3 text-sm leading-7"
          name={issue.fieldName}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={issue.placeholder}
          value={draft}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/85"
            onClick={() => setDraft(issue.aiSuggestion)}
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            {t("Use AI suggestion", "应用 AI 建议")}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-1 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800/85"
            onClick={() => setDraft(issue.original)}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            {t("Reset to original", "恢复原文")}
          </button>
          <SubmitButton className="ml-auto">
            {t("Save revision", "保存修订")}
          </SubmitButton>
        </div>
      </form>

      <form action={runAnalysisAction} className="rounded-2xl border border-slate-600/42 bg-slate-900/72 p-3">
        <input name="resumeId" type="hidden" value={resumeId} />
        <input name="jobDescriptionId" type="hidden" value={jobDescriptionId} />
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-300">
            {t(
              "After saving, re-run analysis to refresh issue priorities and score impact.",
              "保存后建议重新分析，以刷新问题优先级和分数变化。",
            )}
          </p>
          <SubmitButton className="ml-auto" pendingLabel={t("Re-analyzing...", "正在重新分析...")} variant="outline">
            {t("Re-run analysis", "重新分析")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
