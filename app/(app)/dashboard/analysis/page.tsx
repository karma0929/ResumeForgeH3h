import Link from "next/link";
import { ArrowRight, CircleAlert, ListTodo, ScanSearch } from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import {
  AnalysisInlineEditor,
  type AnalysisEditorIssue,
} from "@/components/dashboard/analysis-inline-editor";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAnalysisAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { getUsageRemaining } from "@/lib/usage";
import type { ResumeAnalysis, ResumeRecord, UILanguage } from "@/lib/types";

type IssueSeverity = "high" | "medium" | "low";

interface WorkspaceIssue extends AnalysisEditorIssue {
  severity: IssueSeverity;
  sectionLabel: string;
  problem: string;
  whyItMatters: string;
  hiringLens: string;
}

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function localizeResumeTitle(title: string, uiLanguage: UILanguage) {
  if (uiLanguage !== "zh") {
    return title;
  }

  const mapping: Record<string, string> = {
    "Build From Scratch Draft": "从零创建简历草稿",
    "Guided Resume Draft": "引导式简历草稿",
    "Resume Draft": "简历草稿",
  };

  return mapping[title] ?? title;
}

function sectionText(resume: ResumeRecord, key: string) {
  const section = resume.parsed.sections.find((item) => item.key === key);
  if (!section) {
    return "";
  }
  return [...section.lines, ...section.bullets].filter(Boolean).join("\n");
}

function summaryText(resume: ResumeRecord) {
  return (
    resume.profileData?.professionalSummary ||
    sectionText(resume, "summary") ||
    resume.parsed.sections[0]?.lines.slice(0, 2).join("\n") ||
    ""
  );
}

function skillsText(resume: ResumeRecord) {
  const profileSkills = resume.profileData?.skills ?? [];
  if (profileSkills.length > 0) {
    return profileSkills.join(", ");
  }
  return resume.parsed.skills.join(", ");
}

function experienceText(resume: ResumeRecord) {
  return (
    resume.profileData?.workExperiences[0]?.achievements ||
    resume.profileData?.workExperiences[0]?.responsibilities ||
    resume.parsed.experienceBullets[0] ||
    sectionText(resume, "experience").split("\n")[0] ||
    ""
  );
}

function projectsText(resume: ResumeRecord) {
  return resume.profileData?.projects.join("\n") || sectionText(resume, "projects");
}

function severityRank(severity: IssueSeverity) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function workspaceIssues(input: {
  analysis: ResumeAnalysis;
  resume: ResumeRecord;
  roleLabel: string;
  uiLanguage: UILanguage;
}): WorkspaceIssue[] {
  const t = (en: string, zh: string) => pickText(input.uiLanguage, en, zh);
  const missing = input.analysis.missingKeywords;
  const topMissing = missing[0] ?? t("role-specific keywords", "岗位关键词");
  const summary = summaryText(input.resume);
  const skills = skillsText(input.resume);
  const experience = experienceText(input.resume);
  const projects = projectsText(input.resume);

  const issues: WorkspaceIssue[] = [];

  if (input.analysis.jobFit < 80 || missing.length > 0) {
    issues.push({
      id: "summary_alignment",
      section: "summary",
      sectionLabel: t("Summary", "摘要"),
      title: t("Summary is not role-aligned enough", "摘要与目标岗位对齐不足"),
      severity: input.analysis.jobFit < 70 ? "high" : "medium",
      fieldName: "professionalSummary",
      original: summary,
      aiSuggestion:
        input.uiLanguage === "zh"
          ? `面向 ${input.roleLabel}，我聚焦于可验证的业务结果与跨团队协作交付。重点围绕 ${topMissing} 等岗位核心能力，持续将复杂问题拆解为可执行方案，并通过数据反馈迭代优化。`
          : `Targeting ${input.roleLabel}, I focus on verifiable business outcomes and cross-functional delivery. I emphasize core role signals such as ${topMissing}, turning complex problems into executable plans and improving results through data-driven iteration.`,
      placeholder: t("Rewrite your summary for this target role...", "围绕目标岗位重写你的摘要..."),
      helper: t(
        "Keep it truthful and role-specific. Avoid generic ambition statements.",
        "保持真实并贴合岗位，避免空泛表达。",
      ),
      problem: t(
        "The summary still reads generic and does not clearly anchor to the target role.",
        "当前摘要偏泛化，对目标岗位的锚定不够明确。",
      ),
      whyItMatters: t(
        "Recruiters decide relevance in the first screen. If alignment is weak early, strong details later may be ignored.",
        "招聘方会在首屏快速判断相关性，若开头不对齐，后续亮点可能被忽略。",
      ),
      hiringLens: t(
        "Hiring side is asking: Why this candidate for this role, right now?",
        "招聘方核心问题是：为什么这个候选人现在适合这个岗位？",
      ),
    });
  }

  if (missing.length > 0) {
    const mergedSkills = Array.from(new Set([...skills.split(",").map((item) => item.trim()).filter(Boolean), ...missing]))
      .slice(0, 18)
      .join(", ");

    issues.push({
      id: "keyword_coverage",
      section: "skills",
      sectionLabel: t("Skills", "技能"),
      title: t("Important keywords are underrepresented", "关键关键词覆盖不足"),
      severity: missing.length >= 4 ? "high" : "medium",
      fieldName: "skillsCsv",
      original: skills,
      aiSuggestion: mergedSkills,
      placeholder: t("Add relevant skills as comma-separated tags...", "按逗号补充相关技能标签..."),
      helper: t(
        "Only add keywords that are genuinely supported by your experience.",
        "只添加你真实具备且能被经历支撑的关键词。",
      ),
      problem: t(
        "Several role-critical keywords do not appear strongly in your current resume language.",
        "多个岗位关键关键词在当前简历中出现不足。",
      ),
      whyItMatters: t(
        "ATS and recruiter skim both depend on explicit signal words for initial filtering.",
        "ATS 与招聘者快速筛选都高度依赖显性关键词信号。",
      ),
      hiringLens: t(
        "Hiring side is checking whether your profile speaks the same vocabulary as the job brief.",
        "招聘方会看你的履历语言是否与 JD 使用同一语义词汇。",
      ),
    });
  }

  if (input.analysis.impact < 78) {
    issues.push({
      id: "impact_bullets",
      section: "experience",
      sectionLabel: t("Experience", "经历"),
      title: t("Bullets need stronger outcome signal", "经历要点缺少结果信号"),
      severity: input.analysis.impact < 68 ? "high" : "medium",
      fieldName: "exp1_achievements",
      original: experience,
      aiSuggestion:
        input.uiLanguage === "zh"
          ? "主导关键任务推进并与相关团队协同落地，持续优化执行流程与交付质量；请补充可验证的指标（例如效率提升、成本下降、周期缩短）。"
          : "Led key initiatives with cross-functional partners to improve delivery quality and execution efficiency; add verifiable metrics (for example: faster cycle time, lower cost, improved throughput).",
      placeholder: t("Rewrite one strong achievement bullet...", "重写一条高价值成果要点..."),
      helper: t(
        "Prefer outcome + scope + metric structure. Do not invent numbers.",
        "优先使用“结果 + 范围 + 指标”结构，且不要虚构数据。",
      ),
      problem: t(
        "Current bullet phrasing describes activity, but the business or product impact is not explicit.",
        "当前要点更多在描述动作，业务或产品结果表达不够明确。",
      ),
      whyItMatters: t(
        "Recruiters infer seniority and ownership from impact wording, not task wording alone.",
        "招聘方主要通过成果表达判断层级与 ownership，而不只是任务描述。",
      ),
      hiringLens: t(
        "Hiring side is asking: What changed because of this person?",
        "招聘方核心问题是：因为你做了这件事，结果具体改变了什么？",
      ),
    });
  }

  if (input.analysis.clarity < 76) {
    issues.push({
      id: "clarity_density",
      section: "summary",
      sectionLabel: t("Summary", "摘要"),
      title: t("Narrative is too dense for quick scan", "叙事密度偏高，不利于快速扫描"),
      severity: "medium",
      fieldName: "professionalSummary",
      original: summary,
      aiSuggestion:
        input.uiLanguage === "zh"
          ? `${summary || "请用两到三句概括你的岗位匹配优势。"}`
          : `${summary || "Use 2-3 concise sentences to state role-fit strengths."}`,
      placeholder: t("Trim to concise, high-signal language...", "压缩为更简洁的高信号表达..."),
      helper: t(
        "Shorter, scannable lines improve first-pass recruiter comprehension.",
        "更短、更可扫读的句子有助于提升首屏理解效率。",
      ),
      problem: t(
        "Your key messages are present, but they are not easy to scan quickly.",
        "核心信息是有的，但当前不够利于快速扫读。",
      ),
      whyItMatters: t(
        "Most first reviews are under 30 seconds. Dense writing hides strengths.",
        "大多数首轮浏览不到 30 秒，过密文本会遮蔽优势。",
      ),
      hiringLens: t(
        "Hiring side wants fast signal extraction, not long interpretation effort.",
        "招聘方希望快速提取信号，而不是花时间做解释。",
      ),
    });
  }

  if (input.analysis.suggestions[0]) {
    issues.push({
      id: "project_specificity",
      section: "projects",
      sectionLabel: t("Projects", "项目"),
      title: t("Projects can be made more role-specific", "项目表述可进一步岗位化"),
      severity: "low",
      fieldName: "projectLines",
      original: projects,
      aiSuggestion: input.analysis.suggestions[0],
      placeholder: t("Refine project lines for target role...", "围绕目标岗位优化项目表述..."),
      helper: t(
        "Emphasize project context, technical depth, and measurable contribution.",
        "优先体现项目背景、技术深度与可验证贡献。",
      ),
      problem: t(
        "Project section does not yet highlight the most relevant role signals.",
        "项目分段尚未突出与目标岗位最相关的信号。",
      ),
      whyItMatters: t(
        "For early-career and technical roles, projects often carry outsized decision weight.",
        "对早期职业和技术岗位而言，项目往往有很高决策权重。",
      ),
      hiringLens: t(
        "Hiring side asks whether project evidence maps to real role responsibilities.",
        "招聘方会看项目证据是否能映射真实岗位职责。",
      ),
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "maintain_strength",
      section: "summary",
      sectionLabel: t("General", "综合"),
      title: t("Current draft is in strong shape", "当前草稿状态较好"),
      severity: "low",
      fieldName: "professionalSummary",
      original: summary,
      aiSuggestion: summary,
      placeholder: t("No urgent revision required.", "当前无需紧急修订。"),
      helper: t(
        "You can proceed to tailoring and create role-specific variants.",
        "建议进入定向优化并生成岗位版本。",
      ),
      problem: t(
        "No high-risk blocker detected in this pass.",
        "本轮未检测到高风险阻塞项。",
      ),
      whyItMatters: t(
        "Keep iteration cycle active and validate each tailored version.",
        "继续保持迭代节奏，并验证每个定向版本。",
      ),
      hiringLens: t(
        "At this stage, refinement quality and consistency matter most.",
        "此阶段重点是精修质量与版本一致性。",
      ),
    });
  }

  return issues
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 6);
}

function verdict(overall: number, uiLanguage: UILanguage) {
  if (overall >= 84) {
    return {
      label: pickText(uiLanguage, "Ready for submission", "可进入投递"),
      note: pickText(
        uiLanguage,
        "Strong baseline. Focus on one or two issue-level refinements before export.",
        "基础状态较好，建议修复一到两个问题后再导出。",
      ),
      tone: "border-emerald-400/45 bg-emerald-950/25 text-emerald-100",
    };
  }
  if (overall >= 72) {
    return {
      label: pickText(uiLanguage, "Moderate risk", "中等风险"),
      note: pickText(
        uiLanguage,
        "The resume is credible, but top blockers should be addressed before applying.",
        "简历基础可信，但建议先处理关键阻塞问题后再投递。",
      ),
      tone: "border-amber-400/45 bg-amber-950/25 text-amber-100",
    };
  }
  return {
    label: pickText(uiLanguage, "High risk", "高风险"),
    note: pickText(
      uiLanguage,
      "Prioritize alignment and impact revisions first. Current draft may undersell your fit.",
      "请优先修复对齐度和成果表达，当前草稿可能低估你的匹配度。",
    ),
    tone: "border-rose-400/45 bg-rose-950/25 text-rose-100",
  };
}

const severityStyle: Record<IssueSeverity, string> = {
  high: "border-rose-400/45 bg-rose-950/20 text-rose-100",
  medium: "border-amber-400/45 bg-amber-950/20 text-amber-100",
  low: "border-emerald-400/45 bg-emerald-950/20 text-emerald-100",
};

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
  const jobDescriptionId = queryValue(params, "jobDescriptionId") ?? snapshot.jobDescriptions[0]?.id;
  const issueParam = queryValue(params, "issue");
  const error = queryValue(params, "error");
  const ran = queryValue(params, "ran");
  const legacySaved = queryValue(params, "saved");
  const resumeSaved = queryValue(params, "resumeSaved");

  const resume = snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0];
  const jobDescription =
    snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ?? snapshot.jobDescriptions[0];

  const savedAnalysisGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;

  const analysis = savedAnalysisGeneration
    ? (savedAnalysisGeneration.output as unknown as ResumeAnalysis)
    : null;

  const analysisRemaining = getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, "analysis");
  const canRunAnalysis = analysisRemaining === null || analysisRemaining > 0;

  const issues =
    analysis && resume && jobDescription
      ? workspaceIssues({
          analysis,
          resume,
          roleLabel: `${jobDescription.company} · ${jobDescription.role}`,
          uiLanguage,
        })
      : [];

  const selectedIssue = issues.find((item) => item.id === issueParam) ?? issues[0];
  const blockers = issues.filter((item) => item.severity !== "low").slice(0, 3);
  const summaryVerdict = analysis ? verdict(analysis.overall, uiLanguage) : null;

  const metrics = analysis
    ? [
        { label: t("ATS", "ATS"), value: analysis.atsReadiness },
        { label: t("Clarity", "清晰度"), value: analysis.clarity },
        { label: t("Impact", "影响力"), value: analysis.impact },
        { label: t("Job Fit", "岗位匹配"), value: analysis.jobFit },
      ]
    : [];

  return (
    <div className="rf-dark-ui space-y-6">
      <Reveal>
        <DashboardHeader
          description={t(
            "AI reviewer + inline revision workspace. Diagnose blockers, edit the affected section, and re-analyze in one loop.",
            "这是“AI 审阅 + 内联修订”工作台：识别阻塞问题、就地编辑对应分段、同页重分析形成闭环。",
          )}
          title={t("Resume Analysis Studio", "简历诊断工作台")}
          workspaceLabel={t("AI Review Workspace", "AI 审阅工作区")}
        />
      </Reveal>

      {error ? (
        <StatusBanner description={error} title={t("Analysis unavailable", "分析暂不可用")} tone="warning" />
      ) : null}
      {ran ? (
        <StatusBanner
          description={t(
            "Latest analysis has been refreshed for the selected resume and target role.",
            "已完成所选简历与目标岗位的最新分析刷新。",
          )}
          title={t("Analysis updated", "分析已更新")}
          tone="success"
        />
      ) : null}
      {legacySaved || resumeSaved ? (
        <StatusBanner
          description={t(
            "Revision is saved. Re-run analysis to validate the score and blocker changes.",
            "修订内容已保存。建议重新分析以验证分数和阻塞项变化。",
          )}
          title={t("Revision saved", "修订已保存")}
          tone="success"
        />
      ) : null}

      <Reveal delayMs={60}>
        <section className="rf-surface-strong rounded-[28px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("Current context", "当前上下文")}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">
                {resume ? localizeResumeTitle(resume.title, uiLanguage) : t("No resume selected", "未选择简历")}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {jobDescription
                  ? `${jobDescription.company} · ${jobDescription.role}`
                  : t("No target role selected", "未选择目标岗位")}
              </p>
            </div>
            {summaryVerdict ? (
              <Badge className={summaryVerdict.tone}>{summaryVerdict.label}</Badge>
            ) : null}
          </div>

          <form action={runAnalysisAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">{t("Resume version", "简历版本")}</span>
              <select className="w-full rounded-2xl border px-4 py-3 text-sm" defaultValue={resume?.id} name="resumeId">
                {snapshot.resumes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {localizeResumeTitle(item.title, uiLanguage)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">{t("Target role brief", "目标岗位简报")}</span>
              <select className="w-full rounded-2xl border px-4 py-3 text-sm" defaultValue={jobDescription?.id} name="jobDescriptionId">
                {snapshot.jobDescriptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.company} · {item.role}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              {canRunAnalysis ? (
                <SubmitButton pendingLabel={t("Running...", "分析中...")}>
                  {analysis ? t("Re-run analysis", "重新分析") : t("Run analysis", "开始分析")}
                </SubmitButton>
              ) : (
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 px-5 text-sm font-medium text-white"
                  href="/dashboard/billing?usageLimit=analysis&blocked=1"
                >
                  {t("Upgrade to continue", "升级后继续")}
                </Link>
              )}
            </div>
          </form>

          {summaryVerdict ? <p className="mt-4 text-sm text-slate-300">{summaryVerdict.note}</p> : null}
          {!canRunAnalysis ? (
            <div className="mt-4">
              <UsageLimitPrompt compact action="analysis" />
            </div>
          ) : null}
        </section>
      </Reveal>

      {analysis && resume && jobDescription && selectedIssue ? (
        <Reveal delayMs={90}>
          <section className="grid gap-4 xl:grid-cols-12">
            <aside className="xl:col-span-3">
              <div className="rf-surface rounded-2xl p-4">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <ListTodo className="h-3.5 w-3.5" />
                  {t("Issue navigator", "问题导航")}
                </p>
                <div className="mt-3 space-y-2">
                  {issues.map((issue, index) => {
                    const active = issue.id === selectedIssue.id;
                    return (
                      <Link
                        className={`block rounded-2xl border px-3 py-3 transition ${
                          active
                            ? "border-cyan-300/70 bg-cyan-950/25"
                            : "border-slate-600/42 bg-slate-900/65 hover:border-slate-400/65"
                        }`}
                        href={`/dashboard/analysis?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}&issue=${issue.id}`}
                        key={issue.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-100">{index + 1}. {issue.title}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityStyle[issue.severity]}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-300">{issue.sectionLabel}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="xl:col-span-4 space-y-4">
              <div className="rf-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Current verdict", "当前结论")}</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="text-4xl font-semibold tracking-tight text-slate-50">{analysis.overall}</p>
                  <p className="pb-1 text-sm text-slate-400">/100</p>
                </div>
                <p className="mt-1 text-sm text-slate-300">{t("Top blockers to fix first", "优先修复以下阻塞项")}</p>
                <div className="mt-3 space-y-2">
                  {blockers.length > 0 ? blockers.map((item) => (
                    <p className="text-sm text-slate-200" key={item.id}>• {item.title}</p>
                  )) : (
                    <p className="text-sm text-slate-300">{t("No high-severity blockers found.", "未发现高优先级阻塞项。")}</p>
                  )}
                </div>
              </div>

              <div className="rf-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Sub-metrics", "分项指标")}</p>
                <div className="mt-3 space-y-3">
                  {metrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-200">{metric.label}</span>
                        <span className="text-slate-300">{metric.value}</span>
                      </div>
                      <ProgressBar value={metric.value} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rf-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Issue diagnosis", "问题诊断")}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">{selectedIssue.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{selectedIssue.problem}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  <span className="font-medium text-slate-100">{t("Why it matters", "为什么重要")}：</span>{" "}
                  {selectedIssue.whyItMatters}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  <span className="font-medium text-slate-100">{t("Hiring lens", "招聘视角")}：</span>{" "}
                  {selectedIssue.hiringLens}
                </p>
              </div>
            </div>

            <div className="xl:col-span-5">
              <AnalysisInlineEditor
                key={selectedIssue.id}
                intakeMode={resume.intakeMode}
                issue={selectedIssue}
                jobDescriptionId={jobDescription.id}
                resumeId={resume.id}
                resumeTitle={resume.title}
                uiLanguage={uiLanguage}
              />
            </div>
          </section>
        </Reveal>
      ) : (
        <EmptyState
          ctaHref={resume && jobDescription ? undefined : "/dashboard/upload"}
          ctaLabel={resume && jobDescription ? undefined : t("Add resume and role brief", "添加简历和岗位简报")}
          description={
            resume && jobDescription
              ? t(
                  "Run the first analysis to open issue navigator, diagnosis details, and inline revision editor.",
                  "运行首次分析后，即可进入问题导航、诊断说明和内联修订编辑器。",
                )
              : t(
                  "Analysis workspace requires both sides of comparison: your resume and your target role brief.",
                  "分析工作台需要同时具备两侧信息：你的简历与目标岗位简报。",
                )
          }
          icon={ScanSearch}
          title={t("Start AI diagnosis", "开始 AI 诊断")}
          secondary={
            resume && jobDescription ? (
              canRunAnalysis ? (
                <form action={runAnalysisAction}>
                  <input name="resumeId" type="hidden" value={resume.id} />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                  <SubmitButton pendingLabel={t("Running analysis...", "正在分析...")}>
                    {t("Run analysis", "开始分析")}
                  </SubmitButton>
                </form>
              ) : (
                <UsageLimitPrompt compact action="analysis" />
              )
            ) : null
          }
        />
      )}

      <UsageMeterCard
        description={
          analysisRemaining === null
            ? t("Your current plan includes unlimited analysis runs.", "当前套餐包含不限次分析。")
            : t(
                `${analysisRemaining} analysis ${analysisRemaining === 1 ? "run" : "runs"} left on the free plan.`,
                `免费版剩余 ${analysisRemaining} 次分析机会。`,
              )
        }
        label={t("Analysis usage", "分析用量")}
        limit={analysisRemaining === null ? null : snapshot.usage.analysesUsed + analysisRemaining}
        used={snapshot.usage.analysesUsed}
      />

      <div className="rf-surface rounded-2xl p-4">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
          <CircleAlert className="h-3.5 w-3.5" />
          {t("Iteration loop", "迭代闭环")}
        </p>
        <p className="mt-3 text-sm text-slate-300">
          {t(
            "Fix one high-priority issue at a time, save, re-analyze, then continue into tailoring.",
            "每次只修复一个高优先级问题，保存后重分析，再进入定向优化。",
          )}
        </p>
        {resume && jobDescription ? (
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 px-5 text-sm font-medium text-white"
            href={`/dashboard/tailoring?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
          >
            {t("Continue to tailoring", "继续到定向优化")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
