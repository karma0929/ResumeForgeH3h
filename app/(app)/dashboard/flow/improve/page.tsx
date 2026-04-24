import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ScanSearch,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LocationField } from "@/components/ui/location-field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { SegmentedOptionGroup } from "@/components/ui/segmented-option-group";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { TokenInputField } from "@/components/ui/token-input-field";
import {
  importResumeSourceAction,
  runAnalysisAction,
  runTailoredDraftAction,
  saveJobDescriptionAction,
  summarizeTargetRoleAction,
} from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import type { ResumeAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseStep(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 6) {
    return 1;
  }
  return parsed;
}

function localizeResumeTitle(title: string, uiLanguage: "en" | "zh") {
  if (uiLanguage !== "zh") return title;
  const mapping: Record<string, string> = {
    "Build From Scratch Draft": "从零创建简历草稿",
    "Guided Resume Draft": "引导式简历草稿",
    "Resume Draft": "简历草稿",
  };
  return mapping[title] ?? title;
}

function issueSummaries(input: { analysis: ResumeAnalysis; uiLanguage: "en" | "zh" }) {
  const t = (en: string, zh: string) => pickText(input.uiLanguage, en, zh);
  const issues: Array<{ id: string; label: string; severity: "high" | "medium" | "low" }> = [];
  if (input.analysis.jobFit < 80) {
    issues.push({
      id: "summary_alignment",
      label: t("Summary alignment is weak for target role", "摘要与目标岗位对齐不足"),
      severity: input.analysis.jobFit < 70 ? "high" : "medium",
    });
  }
  if (input.analysis.missingKeywords.length > 0) {
    issues.push({
      id: "keyword_coverage",
      label: t(
        `Missing keywords: ${input.analysis.missingKeywords.slice(0, 3).join(", ")}`,
        `缺失关键词：${input.analysis.missingKeywords.slice(0, 3).join("、")}`,
      ),
      severity: input.analysis.missingKeywords.length >= 4 ? "high" : "medium",
    });
  }
  if (input.analysis.impact < 78) {
    issues.push({
      id: "impact_bullets",
      label: t("Experience bullets need stronger impact signal", "经历要点缺少结果导向表达"),
      severity: input.analysis.impact < 68 ? "high" : "medium",
    });
  }
  if (input.analysis.clarity < 76) {
    issues.push({
      id: "clarity_density",
      label: t("Narrative is too dense for quick scan", "叙事密度偏高，不利于快速扫读"),
      severity: "low",
    });
  }
  if (issues.length === 0) {
    issues.push({
      id: "maintain_strength",
      label: t("No major blockers detected", "未检测到明显阻塞项"),
      severity: "low",
    });
  }
  return issues;
}

export default async function ImproveFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);

  const step = parseStep(queryValue(params, "step"));
  const error = queryValue(params, "error");
  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const parsed = queryValue(params, "parsed") === "1";
  const ran = queryValue(params, "ran") === "1";
  const draft = queryValue(params, "draft") === "1";

  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];
  const analysisGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;
  const analysis = analysisGeneration
    ? (analysisGeneration.output as unknown as ResumeAnalysis)
    : null;
  const tailoredVersion =
    snapshot.resumeVersions.find(
      (item) =>
        item.type === "TAILORED" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;
  const originalVersion =
    snapshot.resumeVersions.find(
      (item) =>
        item.type === "ORIGINAL" &&
        item.resumeId === resume?.id,
    ) ?? null;
  const tailoredDraftGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "TAILORED_RESUME" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id &&
        Boolean((item.input as { draft?: boolean }).draft),
    ) ?? null;

  const hasResume = Boolean(resume && resume.originalText.trim().length >= 80);
  const hasTargetRole = Boolean(jobDescription && jobDescription.role.trim().length >= 2);
  const hasAnalysis = Boolean(analysis);
  const hasTailored = Boolean(tailoredVersion || tailoredDraftGeneration);
  const completionByStep: Record<number, boolean> = {
    1: hasResume,
    2: hasTargetRole,
    3: hasAnalysis,
    4: hasAnalysis,
    5: hasTailored,
    6: hasTailored,
  };
  const firstIncomplete = [1, 2, 3, 4, 5, 6].find((item) => !completionByStep[item]) ?? 6;
  const progress = Math.round((Object.values(completionByStep).filter(Boolean).length / 6) * 100);
  const outputLanguage = resume?.profileData?.preferences.outputLanguage || "en";
  const templateId = resume?.profileData?.preferences.templateId || "classic_ats";
  const issueList = analysis ? issueSummaries({ analysis, uiLanguage }) : [];

  const stepMeta = [
    { id: 1, title: t("Add existing resume", "添加现有简历") },
    { id: 2, title: t("Add target job", "添加目标岗位") },
    { id: 3, title: t("Diagnose fit", "执行匹配诊断") },
    { id: 4, title: t("Fix with AI", "使用 AI 修订") },
    { id: 5, title: t("Generate tailored version", "生成定向版本") },
    { id: 6, title: t("Template and export", "模板与导出") },
  ];

  const stepHref = (targetStep: number) => `/dashboard/flow/improve?step=${targetStep}`;
  const banner = error
    ? {
        title: t("This step needs attention", "该步骤需要处理"),
        description: error,
        tone: "warning" as const,
      }
    : parsed
      ? {
          title: t("Target role summarized", "目标岗位已总结"),
          description: t(
            "Structured role brief is ready. Review and save.",
            "岗位简报已结构化完成，请复核并保存。",
          ),
          tone: "success" as const,
        }
      : ran
        ? {
            title: t("Analysis updated", "分析已更新"),
            description: t(
              "The diagnosis workspace now reflects latest resume and target role context.",
              "诊断工作区已刷新为最新简历与岗位上下文。",
            ),
            tone: "success" as const,
          }
        : resumeSaved || jobDescriptionSaved || draft
          ? {
              title: t("Progress saved", "进度已保存"),
              description: t("Continue to the next guided step.", "请继续下一步引导。"),
              tone: "success" as const,
            }
          : null;

  return (
    <div className="space-y-7">
      <Reveal>
        <DashboardHeader
          action={
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/78 px-4 text-sm font-medium text-slate-100"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Back to start", "返回起点")}
            </Link>
          }
          description={t(
            "Bring your current resume, add a target job, diagnose blockers, revise with AI, then export.",
            "先导入现有简历，再添加目标岗位，随后诊断问题、AI 修订并导出。",
          )}
          title={t("Improve Existing Resume", "优化现有简历")}
          workspaceLabel={t("Guided Improvement Path", "引导式优化路径")}
        />
      </Reveal>

      {banner ? <StatusBanner {...banner} /> : null}

      <Reveal delayMs={70}>
        <section className="rf-surface-strong overflow-hidden rounded-[30px] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("Improve flow", "优化流程")}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                {stepMeta[step - 1]?.title}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {t("Recommended next:", "推荐下一步：")}{" "}
                <span className="font-medium text-slate-100">{stepMeta[firstIncomplete - 1]?.title}</span>
              </p>
            </div>
            <Badge className="border-cyan-400/45 bg-cyan-950/30 text-cyan-100">
              {progress}% {t("complete", "已完成")}
            </Badge>
          </div>

          <div className="mt-4 overflow-x-auto">
            <ol className="flex min-w-max items-center gap-1.5 pb-2">
              {stepMeta.map((item) => {
                const isCurrent = item.id === step;
                const done = completionByStep[item.id];
                const isNext = item.id === firstIncomplete;
                return (
                  <li className="flex items-center gap-1.5" key={item.id}>
                    <Link
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                        isCurrent
                          ? "border-cyan-300/80 bg-gradient-to-r from-cyan-500/25 to-blue-500/30 text-cyan-50"
                          : done
                            ? "border-emerald-400/55 bg-emerald-950/25 text-emerald-100"
                            : "border-slate-600/55 bg-slate-900/72 text-slate-300 hover:border-slate-300/70 hover:text-slate-100",
                      )}
                      href={stepHref(item.id)}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          isCurrent
                            ? "bg-cyan-500 text-slate-950"
                            : done
                              ? "bg-emerald-400 text-slate-950"
                              : "bg-slate-700 text-slate-100",
                        )}
                      >
                        {done ? "✓" : item.id}
                      </span>
                      <span className="whitespace-nowrap">{item.title}</span>
                      {isNext && !isCurrent ? (
                        <span className="rounded-full bg-cyan-900/55 px-1.5 py-0.5 text-[10px] text-cyan-100">
                          {t("next", "下一步")}
                        </span>
                      ) : null}
                    </Link>
                    {item.id < stepMeta.length ? (
                      <span
                        aria-hidden
                        className={cn("h-px w-4 rounded-full", done ? "bg-emerald-400/70" : "bg-slate-700")}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <ProgressBar value={progress} />
        </section>
      </Reveal>

      <Reveal delayMs={120}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {step === 1 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Paste your current resume text. ResumeForge will parse structure and use it as the baseline.",
                    "粘贴你当前简历文本，ResumeForge 会自动解析并作为优化基线。",
                  )}
                </p>
                <form action={importResumeSourceAction} className="space-y-4">
                  <input name="currentStep" type="hidden" value="1" />
                  <input name="nextStep" type="hidden" value="2" />
                  <input name="returnTo" type="hidden" value="/dashboard/flow/improve" />
                  <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
                  <input name="title" type="hidden" value={resume?.title || "Imported Resume"} />

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      {t("Upload resume file (PDF/DOCX/TXT)", "上传简历文件（PDF/DOCX/TXT）")}
                    </span>
                    <input
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="block h-11 w-full cursor-pointer rounded-2xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cyan-600/85 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-cyan-500"
                      name="resumeFile"
                      type="file"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      {t(
                        "If upload fails or format is not ideal, paste your resume text below.",
                        "若上传失败或格式不理想，可直接在下方粘贴简历文本。",
                      )}
                    </p>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">{t("Resume text", "简历文本")}</span>
                    <textarea
                      className="min-h-[260px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-500"
                      defaultValue={resume?.originalText ?? ""}
                      name="quickResumeText"
                      placeholder={t(
                        "Paste your full current resume text.",
                        "请粘贴你完整的当前简历文本。",
                      )}
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                      {t("Save draft", "保存草稿")}
                    </SubmitButton>
                    <SubmitButton pendingLabel={t("Saving...", "正在保存...")}>
                      {t("Continue to target job", "继续到目标岗位")}
                    </SubmitButton>
                  </div>
                </form>
              </Card>
            ) : null}

            {step === 2 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Paste a public job URL or JD text. AI will produce a structured target-role brief.",
                    "粘贴公开岗位链接或岗位文本，AI 会自动生成结构化岗位简报。",
                  )}
                </p>
                <form action={summarizeTargetRoleAction} className="space-y-3">
                  <input name="currentStep" type="hidden" value="2" />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
                  <input name="returnTo" type="hidden" value="/dashboard/flow/improve" />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">{t("Public job URL (optional)", "公开岗位链接（可选）")}</span>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 text-sm text-slate-100 placeholder:text-slate-500"
                      defaultValue={jobDescription?.briefData?.sourceUrl ?? ""}
                      name="jobPostingUrl"
                      placeholder={t("https://company.com/careers/role", "https://company.com/careers/role")}
                      type="url"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">{t("Job description text", "岗位描述文本")}</span>
                    <textarea
                      className="min-h-[170px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                      defaultValue={jobDescription?.description ?? ""}
                      name="jobDescriptionText"
                      placeholder={t("Paste full JD text if URL is unavailable.", "若没有可访问链接，请粘贴完整 JD 文本。")}
                    />
                  </label>
                  <SubmitButton pendingLabel={t("Summarizing...", "总结中...")}>
                    {t("Summarize target role with AI", "使用 AI 生成目标岗位简报")}
                  </SubmitButton>
                </form>

                <form action={saveJobDescriptionAction} className="space-y-4 rounded-2xl border border-slate-600/45 bg-slate-900/75 p-4">
                  <input name="currentStep" type="hidden" value="2" />
                  <input name="nextStep" type="hidden" value="3" />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
                  <input name="returnTo" type="hidden" value="/dashboard/flow/improve" />
                  <input name="sourceUrl" type="hidden" value={jobDescription?.briefData?.sourceUrl ?? ""} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="h-11 rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 text-sm text-slate-100 placeholder:text-slate-500"
                      defaultValue={jobDescription?.company ?? ""}
                      name="company"
                      placeholder={t("Company (optional)", "公司（可选）")}
                      type="text"
                    />
                    <input
                      className="h-11 rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 text-sm text-slate-100 placeholder:text-slate-500"
                      defaultValue={jobDescription?.role ?? ""}
                      name="role"
                      placeholder={t("Role title", "岗位名称")}
                      type="text"
                    />
                    <LocationField
                      defaultValue={jobDescription?.location ?? ""}
                      label={t("Location (optional)", "地点（可选）")}
                      name="location"
                      uiLanguage={uiLanguage}
                    />
                    <div>
                      <span className="mb-2 block text-sm font-medium text-slate-200">{t("Employment type", "雇佣类型")}</span>
                      <SegmentedOptionGroup
                        defaultValue={jobDescription?.briefData?.employmentType ?? ""}
                        name="employmentType"
                        options={[
                          { value: "", label: t("Not specified", "未指定") },
                          { value: "Full-time", label: t("Full-time", "全职") },
                          { value: "Internship", label: t("Internship", "实习") },
                          { value: "Part-time", label: t("Part-time", "兼职") },
                          { value: "Contract", label: t("Contract", "合同制") },
                          { value: "Other", label: t("Other", "其他") },
                        ]}
                      />
                    </div>
                  </div>

                  <TokenInputField
                    defaultValue={jobDescription?.briefData?.topRequiredSkills.join(", ") ?? ""}
                    label={t("Required skills (optional)", "关键技能（可选）")}
                    name="topRequiredSkills"
                    placeholder={t("Node.js, React, SQL", "Node.js、React、SQL")}
                  />
                  <textarea
                    className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={jobDescription?.briefData?.responsibilitiesSummary ?? ""}
                    name="responsibilitiesSummary"
                    placeholder={t("Hiring priorities summary", "招聘重点摘要")}
                  />

                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                      href={stepHref(1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t("Back", "返回")}
                    </Link>
                    <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                      {t("Save draft", "保存草稿")}
                    </SubmitButton>
                    <SubmitButton pendingLabel={t("Saving...", "正在保存...")}>
                      {t("Continue to diagnosis", "继续到诊断")}
                    </SubmitButton>
                  </div>
                </form>
              </Card>
            ) : null}

            {step === 3 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Run diagnosis to identify priority blockers before editing.",
                    "先执行诊断，明确优先修复项，再进入修订。",
                  )}
                </p>
                {!resume || !jobDescription ? (
                  <p className="text-sm text-amber-200">
                    {t("Complete resume and target role first.", "请先完成简历与目标岗位信息。")}
                  </p>
                ) : (
                  <form action={runAnalysisAction} className="flex flex-wrap gap-3">
                    <input name="resumeId" type="hidden" value={resume.id} />
                    <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                    <input name="returnTo" type="hidden" value="/dashboard/flow/improve?step=4" />
                    <SubmitButton pendingLabel={t("Running diagnosis...", "正在执行诊断...")}>
                      <span className="inline-flex items-center gap-2">
                        <ScanSearch className="h-4 w-4" />
                        {analysis ? t("Re-run diagnosis", "重新诊断") : t("Run diagnosis", "开始诊断")}
                      </span>
                    </SubmitButton>
                  </form>
                )}
                {analysis ? (
                  <div className="rounded-2xl border border-slate-600/45 bg-slate-900/75 p-4">
                    <p className="text-sm font-medium text-slate-100">
                      {t("Current readiness score", "当前准备度评分")}：{analysis.overall}/100
                    </p>
                    <div className="mt-3 space-y-2">
                      {issueList.map((item) => (
                        <p key={item.id} className="text-sm text-slate-300">
                          • {item.label}
                        </p>
                      ))}
                    </div>
                    <Link
                      className="mt-4 inline-flex h-10 items-center rounded-full border border-cyan-400/45 bg-cyan-950/30 px-4 text-sm font-medium text-cyan-100"
                      href={`/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                    >
                      {t("Open diagnosis workspace", "打开诊断工作台")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                    href={stepHref(2)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("Back", "返回")}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/85 to-blue-600/85 px-5 text-sm font-medium text-white"
                    href={stepHref(4)}
                  >
                    {t("Continue to issue-by-issue fixing", "继续到逐项修订")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ) : null}

            {step === 4 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Fix blockers inline with AI suggestions, then save and re-check.",
                    "按问题逐条修订，应用 AI 建议并保存后重新诊断。",
                  )}
                </p>
                {analysis && resume && jobDescription ? (
                  <div className="space-y-3">
                    {issueList.map((item, index) => (
                      <Link
                        className="block rounded-2xl border border-slate-600/45 bg-slate-900/78 p-4 text-sm text-slate-200 transition hover:border-cyan-300/55"
                        href={`/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}&issue=${item.id}`}
                        key={item.id}
                      >
                        <p className="font-medium text-slate-100">
                          {index + 1}. {item.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.severity === "high"
                            ? t("High priority", "高优先级")
                            : item.severity === "medium"
                              ? t("Medium priority", "中优先级")
                              : t("Low priority", "低优先级")}
                        </p>
                      </Link>
                    ))}
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-cyan-950/35 px-5 text-sm font-medium text-cyan-100"
                      href={`/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                    >
                      {t("Open full AI revision workspace", "打开完整 AI 修订工作区")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-amber-200">
                    {t("Run diagnosis first to unlock issue-by-issue revision.", "请先执行诊断后再进入逐项修订。")}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                    href={stepHref(3)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("Back", "返回")}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/85 to-blue-600/85 px-5 text-sm font-medium text-white"
                    href={stepHref(5)}
                  >
                    {t("Continue to tailored version", "继续到定向版本")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ) : null}

            {step === 5 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Generate a role-specific resume version from the revised baseline.",
                    "基于已修订基线，生成岗位定向版本。",
                  )}
                </p>
                {resume && jobDescription ? (
                  <div className="flex flex-wrap gap-3">
                    <form action={runTailoredDraftAction}>
                      <input name="resumeId" type="hidden" value={resume.id} />
                      <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                      <input name="returnTo" type="hidden" value="/dashboard/flow/improve?step=6" />
                      <SubmitButton pendingLabel={t("Generating...", "正在生成...")}>
                        <span className="inline-flex items-center gap-2">
                          <WandSparkles className="h-4 w-4" />
                          {t("Generate tailored draft", "生成定向草稿")}
                        </span>
                      </SubmitButton>
                    </form>
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-5 text-sm font-medium text-slate-100"
                      href={`/dashboard/tailoring?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                    >
                      {t("Open tailoring workspace", "打开定向优化工作区")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-amber-200">
                    {t("Complete resume and target role first.", "请先完成简历和目标岗位。")}
                  </p>
                )}
                {hasTailored ? (
                  <div className="rounded-2xl border border-emerald-400/45 bg-emerald-950/25 p-4 text-sm text-emerald-100">
                    {t("Tailored draft/version exists. You can proceed to template and export.", "已存在定向草稿/版本，可继续模板与导出。")}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                    href={stepHref(4)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("Back", "返回")}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/85 to-blue-600/85 px-5 text-sm font-medium text-white"
                    href={stepHref(6)}
                  >
                    {t("Continue to template and export", "继续到模板与导出")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ) : null}

            {step === 6 ? (
              <Card className="space-y-4 border-slate-600/45 bg-slate-900/72 p-6">
                <p className="text-sm text-slate-300">
                  {t(
                    "Choose your final version, then export with selected language and template settings.",
                    "选择最终版本，并按所选语言与模板导出。",
                  )}
                </p>
                {tailoredVersion || originalVersion ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {tailoredVersion ? (
                      <>
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                          href={`/api/export?versionId=${tailoredVersion.id}&format=pdf&lang=${encodeURIComponent(outputLanguage)}&template=${encodeURIComponent(templateId)}`}
                        >
                          <Download className="h-4 w-4" />
                          {t("Tailored PDF", "定向版 PDF")}
                        </a>
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                          href={`/api/export?versionId=${tailoredVersion.id}&format=txt&lang=${encodeURIComponent(outputLanguage)}&template=${encodeURIComponent(templateId)}`}
                        >
                          <Download className="h-4 w-4" />
                          {t("Tailored TXT", "定向版 TXT")}
                        </a>
                      </>
                    ) : null}
                    {originalVersion ? (
                      <>
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                          href={`/api/export?versionId=${originalVersion.id}&format=pdf&lang=${encodeURIComponent(outputLanguage)}&template=${encodeURIComponent(templateId)}`}
                        >
                          <Download className="h-4 w-4" />
                          {t("Baseline PDF", "基线版 PDF")}
                        </a>
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                          href={`/api/export?versionId=${originalVersion.id}&format=txt&lang=${encodeURIComponent(outputLanguage)}&template=${encodeURIComponent(templateId)}`}
                        >
                          <Download className="h-4 w-4" />
                          {t("Baseline TXT", "基线版 TXT")}
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-amber-200">
                    {t("Generate at least one version first.", "请先生成至少一个版本。")}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
                    href={stepHref(5)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("Back", "返回")}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-cyan-950/35 px-5 text-sm font-medium text-cyan-100"
                    href="/dashboard/versions"
                  >
                    {t("Open version center", "打开版本中心")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="xl:sticky xl:top-24 xl:h-fit">
            <div className="rf-surface rounded-[24px] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Path status", "路径状态")}</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: t("Resume baseline", "简历基线"), ok: hasResume },
                  { label: t("Target role brief", "目标岗位简报"), ok: hasTargetRole },
                  { label: t("Diagnosis run", "已执行诊断"), ok: hasAnalysis },
                  { label: t("Tailored output", "定向输出"), ok: hasTailored },
                ].map((item) => (
                  <div className="flex items-center justify-between rounded-xl border border-slate-600/45 bg-slate-900/72 px-3 py-2 text-xs" key={item.label}>
                    <span className="text-slate-200">{item.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        item.ok ? "bg-emerald-950/40 text-emerald-100" : "bg-slate-800 text-slate-400",
                      )}
                    >
                      {item.ok ? t("Done", "完成") : t("Pending", "待完成")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-600/45 bg-slate-900/72 p-3 text-xs text-slate-300">
                <p>
                  {t("Current resume", "当前简历")}：{resume ? localizeResumeTitle(resume.title, uiLanguage) : t("None", "无")}
                </p>
                <p className="mt-1">
                  {t("Current target", "当前目标")}：{jobDescription ? `${jobDescription.company} · ${jobDescription.role}` : t("None", "无")}
                </p>
              </div>

              <Link
                className="rf-nav-pill mt-3 w-full justify-between rounded-xl px-3 py-2 text-xs"
                data-state="inactive"
                href={stepHref(firstIncomplete)}
              >
                <span>{t("Go to recommended step", "前往推荐步骤")}</span>
                <ArrowRight className="rf-nav-pill-icon h-3.5 w-3.5" />
              </Link>

              {resume && jobDescription ? (
                <Link
                  className="rf-nav-pill mt-2 w-full justify-between rounded-xl px-3 py-2 text-xs"
                  data-state="inactive"
                  href={`/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                >
                  <span>{t("Open diagnosis workspace", "打开诊断工作区")}</span>
                  <Sparkles className="rf-nav-pill-icon h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </Reveal>
    </div>
  );
}
