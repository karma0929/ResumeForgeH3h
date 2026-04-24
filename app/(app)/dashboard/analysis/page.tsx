import { ScanSearch } from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import {
  AnalysisWorkspaceClient,
  type AnalysisWorkspaceIssue,
} from "@/components/dashboard/analysis-workspace";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/ui/empty-state";
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
  if (!section) return "";
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
  if (profileSkills.length > 0) return profileSkills.join(", ");
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

function severityRank(severity: AnalysisWorkspaceIssue["severity"]) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function workspaceIssues(input: {
  analysis: ResumeAnalysis;
  resume: ResumeRecord;
  roleLabel: string;
  uiLanguage: UILanguage;
}): AnalysisWorkspaceIssue[] {
  const t = (en: string, zh: string) => pickText(input.uiLanguage, en, zh);
  const missing = input.analysis.missingKeywords;
  const topMissing = missing[0] ?? t("role-specific keywords", "岗位关键词");
  const summary = summaryText(input.resume);
  const skills = skillsText(input.resume);
  const experience = experienceText(input.resume);
  const projects = projectsText(input.resume);
  const issues: AnalysisWorkspaceIssue[] = [];

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
          ? `面向 ${input.roleLabel}，我聚焦于可验证的业务结果与跨团队交付。重点围绕 ${topMissing} 等岗位核心能力，将复杂问题拆解为可执行方案，并通过数据反馈持续优化。`
          : `Targeting ${input.roleLabel}, I focus on verifiable business outcomes and cross-functional delivery. I emphasize core signals such as ${topMissing}, turning complex problems into executable plans and improving results through data feedback.`,
      placeholder: t("Rewrite your summary for this role...", "围绕目标岗位重写你的摘要..."),
      helper: t("Keep it truthful and role-specific.", "保持真实并突出岗位相关性。"),
      problem: t(
        "The summary still reads generic and does not clearly anchor to the target role.",
        "当前摘要偏泛化，对目标岗位的锚定不够明确。",
      ),
      whyItMatters: t(
        "Recruiters decide relevance in the first screen. Weak alignment early can suppress confidence.",
        "招聘方会在首屏判断相关性。若开头不对齐，整体信心会被削弱。",
      ),
      detected: t(
        "Detected broad wording and limited role-keyword anchoring in opening content.",
        "检测到开篇措辞偏宽泛，岗位关键词锚定不足。",
      ),
      recommendedDirection: t(
        "Shift to role-specific value proposition and concise proof statements.",
        "改为岗位导向的价值陈述，并补充简洁证据句。",
      ),
    });
  }

  if (missing.length > 0) {
    const mergedSkills = Array.from(
      new Set([
        ...skills.split(",").map((item) => item.trim()).filter(Boolean),
        ...missing,
      ]),
    )
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
      placeholder: t("Add relevant keywords as skill tags...", "按标签补充相关关键词..."),
      helper: t("Only include keywords supported by real experience.", "只添加真实可支撑的关键词。"),
      problem: t(
        "Several role-critical terms appear weakly or not at all in the resume.",
        "多个岗位关键术语在简历中出现不足或缺失。",
      ),
      whyItMatters: t(
        "ATS and recruiter skim both rely on explicit keyword signals.",
        "ATS 与招聘方快速筛选都依赖显性关键词信号。",
      ),
      detected: t(
        `Detected missing or weak coverage for keywords such as ${missing.slice(0, 4).join(", ")}.`,
        `检测到关键词覆盖不足，例如：${missing.slice(0, 4).join("、")}。`,
      ),
      recommendedDirection: t(
        "Integrate high-priority terms into skills and strongest evidence bullets.",
        "把高优先级术语融入技能区和最强证据要点。",
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
          ? "主导关键任务推进并跨团队协同落地，持续优化执行流程与交付质量；建议补充可验证指标（如效率提升、周期缩短、成本下降）。"
          : "Led key initiatives with cross-functional execution and improved delivery quality; add verifiable metrics (for example: faster cycle time, lower cost, improved throughput).",
      placeholder: t("Rewrite one high-impact bullet...", "重写一条高影响力成果要点..."),
      helper: t("Prefer outcome + scope + metric structure.", "优先使用“结果 + 范围 + 指标”结构。"),
      problem: t(
        "Current bullets describe activity, but impact signal is not explicit enough.",
        "当前要点更多描述动作，结果信号不够明确。",
      ),
      whyItMatters: t(
        "Impact language strongly influences perceived ownership and seniority.",
        "成果表达会直接影响招聘方对层级与 ownership 的判断。",
      ),
      detected: t(
        "Detected low quantified evidence density in core experience bullets.",
        "检测到核心经历中量化证据密度偏低。",
      ),
      recommendedDirection: t(
        "Convert activity statements into measurable outcome statements.",
        "将动作描述改写为可量化结果描述。",
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
          ? summary || "请用两到三句概括岗位匹配优势。"
          : summary || "Use 2-3 concise sentences for role-fit strengths.",
      placeholder: t("Trim into concise, high-signal writing...", "压缩为更简洁的高信号表达..."),
      helper: t("Short, scannable lines improve first-pass readability.", "短句可提升首屏可读性。"),
      problem: t("Key messages are present but not easy to scan.", "核心信息存在，但不利于快速扫读。"),
      whyItMatters: t("Most first-pass resume reviews happen within seconds.", "简历首轮浏览通常只有几十秒。"),
      detected: t(
        "Detected dense phrasing and low scannability in summary-level text.",
        "检测到摘要分段存在高密度表达与低可扫读性。",
      ),
      recommendedDirection: t(
        "Shorten sentence length and keep one signal per line.",
        "缩短句长，并保持“一行一个核心信号”。",
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
      placeholder: t("Refine project lines for this role...", "围绕目标岗位优化项目描述..."),
      helper: t("Highlight context, technical depth, and outcome.", "优先体现背景、技术深度和结果。"),
      problem: t(
        "Project evidence exists but role relevance can be stronger.",
        "项目证据存在，但岗位相关性可进一步增强。",
      ),
      whyItMatters: t("Project framing often determines interview follow-up for technical roles.", "对技术岗位而言，项目叙事常决定后续面试机会。"),
      detected: t("Detected generic project framing with weak role mapping.", "检测到项目叙事偏泛，岗位映射较弱。"),
      recommendedDirection: t("Rewrite project lines using target-role language and impact cues.", "使用岗位语言与结果线索重写项目描述。"),
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
      helper: t("Proceed to tailoring for role-specific versions.", "建议进入定向优化生成岗位版本。"),
      problem: t("No high-risk blocker detected in this pass.", "本轮未检测到高风险阻塞项。"),
      whyItMatters: t("Consistency across tailored versions becomes the next priority.", "后续重点是保证定向版本的一致性。"),
      detected: t("Detected stable baseline with acceptable role alignment.", "检测到基础状态稳定且岗位匹配可接受。"),
      recommendedDirection: t("Maintain structure and iterate with role-specific tailoring.", "保持当前结构并进行岗位化迭代。"),
    });
  }

  return issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 6);
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
  const jobDescriptionId = queryValue(params, "jobDescriptionId") ?? snapshot.jobDescriptions[0]?.id;
  const issueParam = queryValue(params, "issue");
  const error = queryValue(params, "error");
  const ran = queryValue(params, "ran");
  const legacySaved = queryValue(params, "saved");
  const resumeSaved = queryValue(params, "resumeSaved");

  const resume = snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0];
  const jobDescription =
    snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ??
    snapshot.jobDescriptions[0];
  const generation =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;
  const analysis = generation ? (generation.output as unknown as ResumeAnalysis) : null;

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

  const initialIssueId =
    issueParam && issues.some((item) => item.id === issueParam) ? issueParam : issues[0]?.id;
  const recentlySavedIssueId = resumeSaved ? initialIssueId : undefined;

  return (
    <div className="rf-dark-ui space-y-6">
      <Reveal>
        <DashboardHeader
          description={t(
            "Analyze blockers, revise text inline, and iterate with one focused loop.",
            "识别阻塞问题、就地修订文本，并在单一闭环中持续迭代。",
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
            "Revision is saved. Re-run analysis to validate blocker movement.",
            "修订内容已保存。建议重新分析以确认阻塞项变化。",
          )}
          title={t("Revision saved", "修订已保存")}
          tone="success"
        />
      ) : null}

      {analysis && resume && jobDescription ? (
        <AnalysisWorkspaceClient
          analysis={analysis}
          analysisTimestamp={generation?.createdAt ?? null}
          canRunAnalysis={canRunAnalysis}
          initialIssueId={initialIssueId}
          issues={issues}
          jobDescriptionId={jobDescription.id}
          jobOptions={snapshot.jobDescriptions.map((item) => ({
            id: item.id,
            label: `${item.company} · ${item.role}`,
          }))}
          recentResolvedIssueId={recentlySavedIssueId}
          resumeId={resume.id}
          resumeIntakeMode={resume.intakeMode}
          resumeOptions={snapshot.resumes.map((item) => ({
            id: item.id,
            label: localizeResumeTitle(item.title, uiLanguage),
          }))}
          resumeTitle={resume.title}
          targetLabel={`${jobDescription.company} · ${jobDescription.role}`}
          uiLanguage={uiLanguage}
        />
      ) : (
        <EmptyState
          ctaHref={resume && jobDescription ? undefined : "/dashboard/upload"}
          ctaLabel={resume && jobDescription ? undefined : t("Add resume and role brief", "添加简历和岗位简报")}
          description={
            resume && jobDescription
              ? t(
                  "Run the first analysis to open issue navigator, diagnosis details, and inline revision workspace.",
                  "运行首次分析后，即可进入问题导航、诊断说明和内联修订工作区。",
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
    </div>
  );
}
