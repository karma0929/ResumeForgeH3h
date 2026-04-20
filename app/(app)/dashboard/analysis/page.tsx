import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  ScanSearch,
  WandSparkles,
} from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ScoreSummary } from "@/components/dashboard/score-summary";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAnalysisAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import { getUsageRemaining } from "@/lib/usage";
import type { ResumeAnalysis } from "@/lib/types";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const resumeId = queryValue(params, "resumeId") ?? snapshot.resumes[0]?.id;
  const jobDescriptionId =
    queryValue(params, "jobDescriptionId") ?? snapshot.jobDescriptions[0]?.id;
  const error = queryValue(params, "error");
  const ran = queryValue(params, "ran");
  const saved = queryValue(params, "saved");
  const resume = snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0];
  const jobDescription =
    snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ??
    snapshot.jobDescriptions[0];
  const savedAnalysisGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;
  const analysis =
    savedAnalysisGeneration
      ? (savedAnalysisGeneration.output as unknown as ResumeAnalysis)
      : null;
  const topMissingKeywords = analysis?.missingKeywords.slice(0, 5) ?? [];
  const topMatchedKeywords = analysis?.matchedKeywords.slice(0, 5) ?? [];
  const analysisRemaining = getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, "analysis");
  const canRunAnalysis = analysisRemaining === null || analysisRemaining > 0;
  const quickWins = analysis
    ? [
        analysis.missingKeywords.length > 0
          ? t(
              `Work ${analysis.missingKeywords[0]} into your summary, skills, or strongest project bullet.`,
              `把 ${analysis.missingKeywords[0]} 融入摘要、技能或最强项目要点中。`,
            )
          : t("Keyword coverage is in good shape. Focus on making impact clearer.", "关键词覆盖度不错，下一步重点增强成果表达。"),
        analysis.impact < 75
          ? t("Increase quantified outcomes so recruiters can quickly see results.", "增加量化成果，让招聘方更快看到结果。")
          : t("Your impact signal is solid. Tighten wording to make it even easier to skim.", "影响力表达已经不错，继续压缩措辞以提升可读性。"),
        analysis.clarity < 75
          ? t("Shorten dense bullets and keep each line scoped to one outcome.", "缩短过密表述，每行只聚焦一个结果。")
          : t("Clarity is working. Preserve this structure in every tailored version.", "清晰度表现良好，在后续定制版本中保持该结构。"),
      ]
    : [];
  const workflow = getWorkflowState(snapshot);
  const nextAction = getWorkflowAction(snapshot);

  return (
    <div className="space-y-8">
      <DashboardHeader
        description={pickText(
          uiLanguage,
          "Score the active resume against a target job description and save the analysis snapshot for later review.",
          "将当前简历与目标岗位 JD 打分对比，并保存分析快照供后续优化使用。",
        )}
        title={pickText(uiLanguage, "Resume Analysis", "简历分析")}
      />

      {saved ? (
        <StatusBanner
          description={t(
            "The latest analysis snapshot is now recorded and ready to reference while tailoring bullets or versions.",
            "最新分析快照已保存，可在改写要点和生成版本时直接引用。",
          )}
          title={t("Analysis snapshot saved", "分析快照已保存")}
          tone="success"
        />
      ) : null}

      {error ? (
        <StatusBanner
          description={error}
          title={t("Analysis unavailable", "分析暂不可用")}
          tone="warning"
        />
      ) : null}

      {ran ? (
        <StatusBanner
          description={t(
            "ResumeForge scored your active resume against the selected role and updated your latest analysis state.",
            "ResumeForge 已完成当前简历与目标岗位的评分，并更新了最新分析状态。",
          )}
          title={t("Analysis complete", "分析完成")}
          tone="success"
        />
      ) : null}

      <WorkflowStepper compact currentStepId="analysis" workflow={workflow} />

      <Card>
        <form action={runAnalysisAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t("Resume", "简历")}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={resume?.id}
              name="resumeId"
            >
              {snapshot.resumes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t("Job description", "岗位描述")}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.id}
              name="jobDescriptionId"
            >
              {snapshot.jobDescriptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.company} · {item.role}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
                {canRunAnalysis ? (
                  <SubmitButton pendingLabel={t("Running analysis...", "正在分析...")}>
                    {analysis ? t("Run analysis again", "重新分析") : t("Run analysis", "开始分析")}
                  </SubmitButton>
                ) : (
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
                    href="/dashboard/billing?usageLimit=analysis&blocked=1"
                  >
                    {t("Upgrade to continue", "升级后继续")}
                  </Link>
                )}
              </div>
        </form>
      </Card>

      <UsageMeterCard
        description={
          analysisRemaining === null
            ? t(
                "Your current plan includes unlimited resume-to-JD analysis runs.",
                "当前套餐包含不限次简历与 JD 分析。",
              )
            : t(
                `${analysisRemaining} analysis ${analysisRemaining === 1 ? "run" : "runs"} left on the free plan.`,
                `免费版剩余 ${analysisRemaining} 次分析机会。`,
              )
        }
        label={t("Analysis usage", "分析用量")}
        limit={analysisRemaining === null ? null : snapshot.usage.analysesUsed + analysisRemaining}
        used={snapshot.usage.analysesUsed}
      />

      {analysis && resume && jobDescription ? (
        <>
          <ScoreSummary
            analysis={analysis}
            targetLabel={`${jobDescription.company} · ${jobDescription.role}`}
            uiLanguage={uiLanguage}
          />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="bg-gradient-to-br from-white to-slate-50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-700">{t("Hiring readout", "招聘视角解读")}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {t("ResumeForge recruiter summary", "ResumeForge 招聘结论摘要")}
                  </h2>
                </div>
                <Badge className="bg-slate-900 text-white">
                  {analysis.overall >= 80
                    ? t("Likely shortlist", "有望进入 shortlist")
                    : analysis.overall >= 70
                      ? t("Needs polish", "仍需打磨")
                      : t("At risk", "风险较高")}
                </Badge>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Matched", "已匹配")}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.matchedKeywords.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{t("keywords aligned to the JD", "与 JD 对齐的关键词")}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Missing", "缺失")}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.missingKeywords.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{t("keywords still underrepresented", "仍需补强的关键词")}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Suggestions", "建议项")}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.suggestions.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{t("recommended edits to prioritize", "建议优先处理的改动")}</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-900">
                  {t("What a recruiter would notice first", "招聘方最先会看到什么")}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {analysis.overall >= 80
                    ? t(
                        "The resume already maps well to the role. The strongest lever now is making impact and role-specific keywords even more obvious in the first scan.",
                        "你的简历已经与目标岗位较好匹配。下一步应在首屏更突出成果与岗位关键词。",
                      )
                    : analysis.overall >= 70
                      ? t(
                          "The foundation is credible, but the resume is not yet telling the tightest story for this specific role. Close the keyword and impact gaps first.",
                          "基础是可信的，但对该岗位的叙事还不够紧。请优先补齐关键词和成果表达差距。",
                        )
                      : t(
                          "There is enough relevant experience here, but the resume is underselling fit. The current wording is likely leaving recruiter confidence on the table.",
                          "你有相关经历，但简历对匹配度表达偏弱，当前措辞可能削弱招聘方信心。",
                        )}
                </p>
              </div>
              {!canRunAnalysis ? <div className="mt-6"><UsageLimitPrompt compact action="analysis" /></div> : null}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priority actions</p>
                  <p className="text-lg font-semibold text-slate-950">{t("What to fix next", "下一步修复重点")}</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {quickWins.map((item, index) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t("Recommended next step", "推荐下一步")}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
                  {t(
                    "Move directly into tailoring once you save this snapshot so rewrites stay anchored to the same target JD.",
                    "保存分析快照后，建议直接进入定制改写，以确保改写始终围绕同一目标 JD。",
                  )}
                </div>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800"
                  href={`/dashboard/tailoring?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                >
                  {t("Open tailoring workspace", "打开定制工作区")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t("Keyword alignment", "关键词匹配")}</p>
                  <p className="text-lg font-semibold text-slate-950">
                    {t("Matched vs missing signals", "匹配与缺失信号对比")}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <p className="text-sm font-medium text-emerald-800">{t("Matched keywords", "已匹配关键词")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topMatchedKeywords.length > 0 ? (
                      topMatchedKeywords.map((keyword) => (
                        <Badge key={keyword} className="bg-white text-emerald-700">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-emerald-800/80">
                        {t("No strong keyword matches yet.", "尚无明显关键词匹配。")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-5">
                  <p className="text-sm font-medium text-amber-900">{t("Missing keywords", "缺失关键词")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topMissingKeywords.length > 0 ? (
                      topMissingKeywords.map((keyword) => (
                        <Badge key={keyword} className="bg-white text-amber-700">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-amber-900/80">
                        {t("No major keyword gaps detected.", "未检测到明显关键词缺口。")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-900">{t("Score breakdown", "评分拆解")}</p>
                <div className="mt-4 space-y-5">
                  {analysis.categories.map((category) => (
                    <div key={category.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{category.label}</span>
                        <span className="text-slate-500">{category.score}</span>
                      </div>
                      <ProgressBar value={category.score} />
                      <p className="mt-2 text-sm text-slate-600">{category.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("Strengths", "优势项")}</p>
                    <p className="text-lg font-semibold text-slate-950">{t("What is already working", "当前有效项")}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {analysis.strengths.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <WandSparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("Suggested edits", "建议改动")}</p>
                    <p className="text-lg font-semibold text-slate-950">
                      {t("Best levers to improve fit", "提升匹配度的最佳杠杆")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {analysis.suggestions.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          ctaHref={resume && jobDescription ? undefined : "/dashboard/upload"}
          ctaLabel={resume && jobDescription ? undefined : t("Add resume and job description", "添加简历与岗位描述")}
          description={
            resume && jobDescription
              ? t(
                  "Select a resume and job description, then run your first analysis to see ATS alignment, clarity, impact, and job fit.",
                  "选择简历与岗位描述后，运行首次分析即可查看 ATS 匹配度、清晰度、影响力与岗位契合度。",
                )
              : t(
                  "Analysis becomes available once ResumeForge has both sides of the comparison: your resume and the role you are targeting.",
                  "当 ResumeForge 同时拿到你的简历和目标岗位后，即可开始分析。",
                )
          }
          icon={ScanSearch}
          title={t("Run your first ATS analysis", "运行你的首次 ATS 分析")}
          secondary={
            resume && jobDescription ? (
              canRunAnalysis ? (
                <form action={runAnalysisAction}>
                  <input name="resumeId" type="hidden" value={resume.id} />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                  <SubmitButton pendingLabel={t("Running analysis...", "正在分析...")}>{t("Run analysis", "开始分析")}</SubmitButton>
                </form>
              ) : (
                <UsageLimitPrompt compact action="analysis" />
              )
            ) : null
          }
        />
      )}

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Next best action", "下一步建议")}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          {nextAction.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{nextAction.description}</p>
        <div className="mt-5">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href={nextAction.href}
          >
            {nextAction.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
