import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ResumePreview } from "@/components/resume/resume-preview";
import { TemplateGalleryField } from "@/components/resume/template-gallery-field";
import { MonthField } from "@/components/ui/month-field";
import { MonthRangeField } from "@/components/ui/month-range-field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { SegmentedOptionGroup } from "@/components/ui/segmented-option-group";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { TokenInputField } from "@/components/ui/token-input-field";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import {
  generateBuildDraftAction,
  parseJobPostingUrlAction,
  saveJobDescriptionAction,
  saveResumeAction,
} from "@/lib/actions/dashboard";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { buildResumeRenderModel, RESUME_TEMPLATES } from "@/lib/resume-render";
import { cn } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseStep(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 10) {
    return fallback;
  }
  return parsed;
}

function parseEducationLine(value: string) {
  const [headline, detailBlock = ""] = value.split(" — ");
  const headlineParts = headline.split("|").map((part) => part.trim()).filter(Boolean);
  const details = detailBlock.split("|").map((part) => part.trim()).filter(Boolean);

  const school = headlineParts[0] ?? "";
  const degreeMajor = headlineParts[1] ?? "";
  const inSplit = degreeMajor.split(" in ");
  const degree = inSplit[0] ?? "";
  const major = inSplit.slice(1).join(" in ");

  return {
    school,
    degree,
    major,
    graduationDate: details.find((item) => item.startsWith("Graduation:"))?.replace("Graduation:", "").trim() ?? "",
    gpa: details.find((item) => item.startsWith("GPA:"))?.replace("GPA:", "").trim() ?? "",
    honors: details.find((item) => item.startsWith("Honors:"))?.replace("Honors:", "").trim() ?? "",
    coursework: details.find((item) => item.startsWith("Coursework:"))?.replace("Coursework:", "").trim() ?? "",
  };
}

function parseProjectLine(value: string) {
  const [headline, body = ""] = value.split(" — ");
  const headlineParts = headline.split("|").map((part) => part.trim()).filter(Boolean);
  const bodyParts = body.split(" — ").map((part) => part.trim()).filter(Boolean);

  return {
    name: headlineParts[0] ?? "",
    role: (headlineParts.find((part) => part.startsWith("Role:")) ?? "").replace("Role:", "").trim(),
    dates: headlineParts.find((part) => !part.startsWith("Role:") && part !== (headlineParts[0] ?? "")) ?? "",
    technologies: (bodyParts.find((part) => part.startsWith("Technologies:")) ?? "")
      .replace("Technologies:", "")
      .trim(),
    description: bodyParts.find((part) => !part.startsWith("Technologies:") && !part.startsWith("Impact:")) ?? "",
    impact: (bodyParts.find((part) => part.startsWith("Impact:")) ?? "").replace("Impact:", "").trim(),
  };
}

const stepBlueprints = [
  {
    number: 1,
    title: { en: "Basic identity", zh: "基础身份信息" },
    description: { en: "Set your resume identity and direction.", zh: "先确定你的简历身份与方向。" },
  },
  {
    number: 2,
    title: { en: "Education", zh: "教育背景" },
    description: { en: "Capture schooling and academic context.", zh: "补充院校与学术背景信息。" },
  },
  {
    number: 3,
    title: { en: "Work / internships", zh: "工作 / 实习经历" },
    description: { en: "Add practical experience and outcomes.", zh: "添加实践经历与产出结果。" },
  },
  {
    number: 4,
    title: { en: "Projects", zh: "项目经历" },
    description: { en: "Show applied skills through project work.", zh: "通过项目展示可落地能力。" },
  },
  {
    number: 5,
    title: { en: "Skills and tools", zh: "技能与工具" },
    description: { en: "Define your technical and professional stack.", zh: "定义你的技术栈与专业能力。" },
  },
  {
    number: 6,
    title: { en: "Optional enhancements", zh: "可选增强信息" },
    description: { en: "Add optional signals that strengthen profile quality.", zh: "补充可选信号以增强简历质量。" },
  },
  {
    number: 7,
    title: { en: "Target role information", zh: "目标岗位信息" },
    description: { en: "Anchor the resume to a target role and context.", zh: "让简历锚定具体岗位与上下文。" },
  },
  {
    number: 8,
    title: { en: "Style preferences", zh: "风格偏好" },
    description: { en: "Choose tone and emphasis for generated output.", zh: "设置输出语气与强调方向。" },
  },
  {
    number: 9,
    title: { en: "Review and generate", zh: "复核与生成" },
    description: { en: "Check completeness and generate a first draft.", zh: "检查完整度并生成首版草稿。" },
  },
  {
    number: 10,
    title: { en: "Generated result", zh: "生成结果" },
    description: { en: "Preview, edit, regenerate, and export.", zh: "预览、编辑、重生成与导出。" },
  },
];

const degreeOptions = [
  "Associate",
  "Bachelor",
  "Master",
  "PhD",
  "MBA",
  "Other",
] as const;

const degreeLabelZh: Record<(typeof degreeOptions)[number], string> = {
  Associate: "专科",
  Bachelor: "本科",
  Master: "硕士",
  PhD: "博士",
  MBA: "MBA",
  Other: "其他",
};

const resumeStyleOptions = [
  { value: "", en: "Not specified", zh: "未指定" },
  { value: "neutral", en: "Neutral", zh: "中性" },
  { value: "technical", en: "Technical", zh: "技术导向" },
  { value: "achievement_focused", en: "Achievement-focused", zh: "成果导向" },
  { value: "leadership_focused", en: "Leadership-focused", zh: "领导力导向" },
  { value: "executive", en: "Executive", zh: "高管风格" },
  { value: "student_friendly", en: "Student-friendly", zh: "学生友好" },
];

const summaryStyleOptions = [
  { value: "", en: "Not specified", zh: "未指定" },
  { value: "concise", en: "Concise", zh: "简洁" },
  { value: "narrative", en: "Narrative", zh: "叙事型" },
  { value: "impact_first", en: "Impact-first", zh: "成果优先" },
  { value: "technical", en: "Technical", zh: "技术型" },
  { value: "recruiter_friendly", en: "Recruiter-friendly", zh: "招聘友好" },
];

export default async function BuildFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const steps = stepBlueprints.map((item) => ({
    number: item.number,
    title: t(item.title.en, item.title.zh),
    description: t(item.description.en, item.description.zh),
  }));

  const resume = snapshot.resumes[0];
  const profile = resume?.profileData;
  const jobDescription = snapshot.jobDescriptions[0];
  const originalVersion = snapshot.resumeVersions.find(
    (version) => version.resumeId === resume?.id && version.type === "ORIGINAL",
  );
  const latestDraftGeneration =
    snapshot.aiGenerations.find((item) => {
      if (item.type !== "TAILORED_RESUME" || item.resumeId !== resume?.id) {
        return false;
      }
      const input = (item.input ?? {}) as Record<string, unknown>;
      return input.draftType === "guided_resume_draft";
    }) ?? null;
  const draftQualityNotes = (() => {
    if (!latestDraftGeneration) {
      return [];
    }
    const output = (latestDraftGeneration.output ?? {}) as Record<string, unknown>;
    if (!Array.isArray(output.qualityNotes)) {
      return [];
    }
    return output.qualityNotes
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
  })();

  const hasStep1 = Boolean(
    profile &&
      profile.basicProfile.fullName &&
      (profile.basicProfile.currentTitle || profile.basicProfile.targetTitle),
  );
  const hasStep2 = Boolean(profile && profile.education.length > 0);
  const hasStep3 = Boolean(profile && profile.workExperiences.length > 0);
  const hasStep4 = Boolean(profile && profile.projects.length > 0);
  const hasStep5 = Boolean(profile && profile.skills.length > 0);
  const hasStep6 = Boolean(
    profile &&
      (profile.certifications.length > 0 ||
        profile.awards.length > 0 ||
        profile.links.github ||
        profile.links.linkedIn ||
        profile.links.portfolio ||
        profile.notes),
  );
  const hasStep7 = Boolean(jobDescription && jobDescription.role.length >= 2);
  const hasStep8 = Boolean(
    profile &&
      (profile.preferences.resumeStyle ||
        profile.preferences.keywordEmphasis ||
        profile.preferences.industryPreference ||
        profile.preferences.outputLanguage ||
        profile.preferences.templateId),
  );
  const hasGeneratedDraft = Boolean(resume && resume.originalText.length >= 120 && originalVersion);
  const optionalSteps = new Set([6, 8]);
  const completionByStep: Record<number, boolean> = {
    1: hasStep1,
    2: hasStep2,
    3: hasStep3,
    4: hasStep4,
    5: hasStep5,
    6: hasStep6,
    7: hasStep7,
    8: hasStep8,
    9: hasGeneratedDraft,
    10: hasGeneratedDraft,
  };

  const firstIncomplete = steps.find((stepItem) => !completionByStep[stepItem.number])?.number ?? 10;
  const requestedStep = parseStep(queryValue(params, "step"), firstIncomplete);
  const step = requestedStep;
  const stepMeta = steps[step - 1];
  const completedCount = Object.values(completionByStep).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 10) * 100);

  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const draftSaved = queryValue(params, "draft") === "1";
  const generated = queryValue(params, "generated") === "1";
  const parsedFromUrl = queryValue(params, "parsed") === "1";
  const error = queryValue(params, "error");

  const banner = error
    ? {
        title: t("This step needs attention", "该步骤需要处理"),
        description: error,
        tone: "warning" as const,
      }
    : generated
      ? {
          title: t("Resume draft generated", "简历草稿已生成"),
          description: t("Preview and edit your generated result below.", "可在下方预览并编辑生成结果。"),
          tone: "success" as const,
        }
      : parsedFromUrl
        ? {
            title: t("Job posting parsed", "岗位链接解析完成"),
            description: t(
              "Extracted fields are filled below. Review and edit before saving.",
              "已自动填充解析结果，请在下方复核并按需修改后保存。",
            ),
            tone: "success" as const,
          }
      : resumeSaved && draftSaved
        ? {
            title: t("Draft saved", "草稿已保存"),
            description: t("Progress is saved. Continue when ready.", "进度已保存，可随时继续。"),
            tone: "success" as const,
          }
        : resumeSaved
          ? {
              title: t("Step saved", "步骤已保存"),
              description: t("Continue to the next section.", "继续下一个步骤。"),
              tone: "success" as const,
            }
          : jobDescriptionSaved
            ? {
                title: t("Target role saved", "目标岗位已保存"),
                description: t("Your role context is ready for generation and analysis.", "岗位上下文已就绪，可继续生成与分析。"),
                tone: "success" as const,
              }
            : null;

  const parsedEducation = (profile?.education ?? []).slice(0, 3).map(parseEducationLine);
  const parsedProjects = (profile?.projects ?? []).slice(0, 3).map(parseProjectLine);
  const outputLanguage = profile?.preferences.outputLanguage || "en";
  const templateId = profile?.preferences.templateId || "classic_ats";
  const stepCardClass = "space-y-5 border-slate-600/45 bg-slate-900/72 p-6 shadow-[0_26px_60px_-45px_rgba(15,23,42,0.78)] backdrop-blur-sm";
  const previewModel =
    originalVersion && resume?.profileData
      ? buildResumeRenderModel({
          version: originalVersion,
          profileData: resume.profileData,
          requestedLanguage: outputLanguage,
          requestedTemplate: templateId,
        })
      : null;
  const exportSuffix = `&lang=${encodeURIComponent(outputLanguage)}&template=${encodeURIComponent(templateId)}`;

  return (
    <div className="rf-dark-ui relative space-y-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-2 -z-10 h-56 rounded-[42px] bg-[radial-gradient(circle_at_20%_18%,rgba(14,165,233,0.24),transparent_48%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.22),transparent_44%)] blur-2xl"
      />
      <Reveal>
        <DashboardHeader
          action={
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/75 px-4 text-sm font-medium text-slate-100"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              {pickText(uiLanguage, "Back to start", "返回起点")}
            </Link>
          }
          description={pickText(
            uiLanguage,
            "Complete one section at a time. Most fields are optional, and every step supports save draft.",
            "一次只完成一个步骤。大多数字段均可选，并支持每步保存草稿。",
          )}
          title={pickText(uiLanguage, "Build From Scratch", "从零创建")}
          workspaceLabel={pickText(uiLanguage, "ResumeForge Workspace", "ResumeForge 工作区")}
        />
      </Reveal>

      {banner ? <StatusBanner {...banner} /> : null}

      <Reveal delayMs={70}>
        <section className="rf-surface-strong overflow-hidden rounded-[30px] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t("Build Flow", "构建流程")}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
              {stepMeta.title}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {t("Recommended next:", "推荐下一步：")}{" "}
              <span className="font-medium text-slate-100">{steps[firstIncomplete - 1]?.title}</span>
            </p>
          </div>
          <Badge className="border-cyan-400/45 bg-cyan-950/30 text-cyan-100">{progressPercent}% {t("complete", "已完成")}</Badge>
        </div>

        <div className="mt-4 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-1.5 pb-2">
            {steps.map((item) => {
              const isCurrent = item.number === step;
              const done = completionByStep[item.number];
              const isNext = item.number === firstIncomplete;
              return (
                <li className="flex items-center gap-1.5" key={item.number}>
                  <Link
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                      isCurrent
                        ? "border-cyan-300/80 bg-gradient-to-r from-cyan-500/25 to-blue-500/30 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(224,242,254,0.18)]"
                        : done
                          ? "border-emerald-400/55 bg-emerald-950/25 text-emerald-100"
                          : "border-slate-600/55 bg-slate-900/72 text-slate-300 hover:border-slate-300/70 hover:text-slate-100",
                    )}
                    href={`/dashboard/flow/build?step=${item.number}`}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                        isCurrent
                          ? "bg-cyan-500 text-slate-950"
                          : done
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-700 text-slate-100 group-hover:bg-slate-500",
                      )}
                    >
                      {done ? "✓" : item.number}
                    </span>
                    <span className="whitespace-nowrap">{item.title}</span>
                    {optionalSteps.has(item.number) ? (
                      <span className="rounded-full bg-slate-800/85 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {t("optional", "可选")}
                      </span>
                    ) : null}
                    {isNext && !isCurrent ? (
                      <span className="rounded-full bg-cyan-900/55 px-1.5 py-0.5 text-[10px] text-cyan-100">
                        {t("next", "下一步")}
                      </span>
                    ) : null}
                  </Link>
                  {item.number < steps.length ? (
                    <span
                      aria-hidden
                      className={cn(
                        "h-px w-4 rounded-full",
                        done ? "bg-emerald-400/70" : "bg-slate-700",
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-1">
          <ProgressBar value={progressPercent} />
        </div>
        </section>
      </Reveal>

      <Reveal delayMs={110}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 px-3 py-2 text-sm text-slate-300">
            <span className="font-medium text-slate-100">
              {t(`Step ${step} of 10`, `第 ${step} / 10 步`)}
            </span>{" "}
            · {stepMeta.description}
          </div>

      {step === 1 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t(
              "Start with your identity details. You can leave optional fields blank and return later.",
              "先填写基础身份信息。可选字段可暂时留空，后续再补充。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="1" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">{t("Full name", "姓名")}</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.basicProfile.fullName ?? snapshot.user.name}
                name="fullName"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {t("Email (from account)", "邮箱（来自账号）")}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
                defaultValue={snapshot.user.email}
                disabled
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Current title", "当前职位")}</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.currentTitle ?? snapshot.user.headline}
                  name="currentTitle"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Desired title", "目标职位")}</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.targetTitle ?? snapshot.user.targetRole}
                  name="targetTitle"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Location", "地点")}</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.location ?? snapshot.user.location}
                  name="profileLocation"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Work authorization (optional)", "工作签证状态（可选）")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.workAuthorization ?? ""}
                  name="workAuthorization"
                  placeholder={t("e.g. F-1 OPT, H-1B sponsorship required", "例如：F-1 OPT，需要 H-1B sponsor")}
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Years of experience (optional)", "工作年限（可选）")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.yearsExperience ?? ""}
                  name="yearsExperience"
                  type="text"
                />
              </label>
              <div className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Career level (optional)", "职业级别（可选）")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  defaultValue={profile?.basicProfile.careerLevel ?? ""}
                  name="careerLevel"
                >
                  <option value="">{t("Not specified", "未指定")}</option>
                  <option value="student_new_grad">{t("Student / New Grad", "学生 / 应届")}</option>
                  <option value="internship_candidate">{t("Internship Candidate", "实习候选人")}</option>
                  <option value="entry_level">{t("Entry Level", "入门级")}</option>
                  <option value="early_career">{t("Early Career", "职业早期")}</option>
                  <option value="mid_level">{t("Mid-Level", "中级")}</option>
                  <option value="senior">{t("Senior", "高级")}</option>
                  <option value="lead_staff">{t("Lead / Staff", "技术负责人 / 专家")}</option>
                  <option value="manager">{t("Manager", "经理")}</option>
                  <option value="director_plus">{t("Director+", "总监及以上")}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="2">
                {t("Continue to education", "继续到教育背景")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t(
              "Add education entries. Optional fields help recruiters understand academic strength.",
              "填写教育经历。可选字段可帮助招聘方更好理解你的学术背景。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="2" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {[1, 2, 3].map((index) => {
              const item = parsedEducation[index - 1];
              return (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">{t("Education entry", "教育经历")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.school ?? ""}
                      name={`edu${index}_school`}
                      placeholder={t("School", "学校")}
                      type="text"
                    />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">{t("Degree", "学位")}</span>
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        defaultValue={item?.degree ?? ""}
                        name={`edu${index}_degree`}
                      >
                        <option value="">{t("Select degree", "选择学位")}</option>
                        {item?.degree && !degreeOptions.includes(item.degree as (typeof degreeOptions)[number]) ? (
                          <option value={item.degree}>{item.degree}</option>
                        ) : null}
                        {degreeOptions.map((degree) => (
                          <option key={degree} value={degree}>
                            {t(degree, degreeLabelZh[degree])}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.major ?? ""}
                      name={`edu${index}_major`}
                      placeholder={t("Major", "专业")}
                      type="text"
                    />
                    <MonthField
                      defaultValue={item?.graduationDate ?? ""}
                      label={t("Graduation month", "毕业月份")}
                      name={`edu${index}_graduationDate`}
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.gpa ?? ""}
                      name={`edu${index}_gpa`}
                      placeholder={t("GPA (optional)", "GPA（可选）")}
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.honors ?? ""}
                      name={`edu${index}_honors`}
                      placeholder={t("Honors (optional)", "荣誉（可选）")}
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.coursework ?? ""}
                    name={`edu${index}_coursework`}
                    placeholder={t("Relevant coursework (optional)", "相关课程（可选）")}
                  />
                </div>
              );
            })}

            <p className="text-xs text-slate-500">{t("You can leave entries blank and return later.", "可先留空，后续再补充。")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=1"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="3">
                {t("Continue to experience", "继续到工作/实习经历")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t(
              "Add internship or work entries. If you can, mention measurable outcomes.",
              "填写工作或实习经历。尽量补充可量化的成果数据。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="3" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {[1, 2, 3].map((index) => {
              const item = profile?.workExperiences[index - 1];
              return (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">{t("Experience entry", "经历条目")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.company ?? ""}
                      name={`exp${index}_company`}
                      placeholder={t("Company", "公司")}
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.title ?? ""}
                      name={`exp${index}_title`}
                      placeholder={t("Role/title", "职位")}
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.location ?? ""}
                      name={`exp${index}_location`}
                      placeholder={t("Location", "地点")}
                      type="text"
                    />
                    <MonthRangeField
                      className="md:col-span-2"
                      defaultValue={item?.dates ?? ""}
                      endLabel={t("End month", "结束月份")}
                      name={`exp${index}_dates`}
                      startLabel={t("Start month", "开始月份")}
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.responsibilities ?? ""}
                    name={`exp${index}_responsibilities`}
                    placeholder={t("Responsibilities", "职责描述")}
                  />
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.achievements ?? ""}
                    name={`exp${index}_achievements`}
                    placeholder={t("Achievements", "成果")}
                  />
                  <input
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.quantifiedImpact ?? ""}
                    name={`exp${index}_quantifiedImpact`}
                    placeholder={t("Quantified impact (optional)", "量化影响（可选）")}
                    type="text"
                  />
                </div>
              );
            })}

            <p className="text-xs text-slate-500">
              {t(
                "Example: Reduced processing time by 25% by automating weekly report generation.",
                "示例：通过自动化周报流程，将处理时间缩短 25%。",
              )}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="4">
                {t("Continue to projects", "继续到项目经历")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t("Show projects that demonstrate practical skills and impact.", "填写能体现实战能力与影响力的项目经历。")}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="4" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {[1, 2, 3].map((index) => {
              const item = parsedProjects[index - 1];
              return (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">{t("Project entry", "项目条目")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.name ?? ""}
                      name={`project${index}_name`}
                      placeholder={t("Project name", "项目名称")}
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.role ?? ""}
                      name={`project${index}_role`}
                      placeholder={t("Role", "角色")}
                      type="text"
                    />
                    <MonthRangeField
                      className="md:col-span-2"
                      defaultValue={item?.dates ?? ""}
                      endLabel={t("End month (optional)", "结束月份（可选）")}
                      name={`project${index}_dates`}
                      startLabel={t("Start month", "开始月份")}
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.technologies ?? ""}
                      name={`project${index}_technologies`}
                      placeholder={t("Technologies", "技术栈")}
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.description ?? ""}
                    name={`project${index}_description`}
                    placeholder={t("Project description", "项目描述")}
                  />
                  <textarea
                    className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.impact ?? ""}
                    name={`project${index}_impact`}
                    placeholder={t("Impact / outcome (optional)", "结果/影响（可选）")}
                  />
                </div>
              );
            })}

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=3"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="5">
                {t("Continue to skills", "继续到技能与工具")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t("List your tools and capabilities. Keep it practical and role relevant.", "填写技能与工具，尽量与目标岗位保持相关。")}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="5" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <TokenInputField
              defaultValue={profile?.skills.join(", ") ?? ""}
              helperText={t("Press Enter or comma to add each skill.", "输入后按 Enter 或逗号添加技能标签。")}
              label={t("Programming languages", "编程语言")}
              name="languagesCsv"
              placeholder={t("Python, JavaScript, TypeScript", "Python、JavaScript、TypeScript")}
            />
            <TokenInputField
              helperText={t("Use concise stack names.", "建议使用简洁技术名。")}
              label={t("Frameworks", "框架")}
              name="frameworksCsv"
              placeholder={t("React, Next.js, Node.js", "React、Next.js、Node.js")}
            />
            <TokenInputField
              helperText={t("Include cloud/devops/tools if relevant.", "可补充云平台、DevOps 与常用工具。")}
              label={t("Tools / platforms", "工具 / 平台")}
              name="toolsPlatformsCsv"
              placeholder={t("AWS, Docker, GitHub Actions", "AWS、Docker、GitHub Actions")}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TokenInputField
                label={t("Soft skills (optional)", "软技能（可选）")}
                name="softSkillsCsv"
                placeholder={t("Communication, stakeholder alignment", "沟通、跨团队协作")}
              />
              <TokenInputField
                label={t("Domain knowledge (optional)", "行业知识（可选）")}
                name="domainKnowledgeCsv"
                placeholder={t("Fintech, edtech, healthcare", "金融科技、教育科技、医疗")}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=4"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="6">
                {t("Continue to enhancements", "继续到可选增强信息")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t(
              "Optional fields below can improve output quality. Leave blank if you do not have this information yet.",
              "以下可选字段可提升生成质量。若暂无信息，可先留空。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="6" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Certifications (one per line)", "证书（每行一条）")}
                </span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.certifications.join("\n") ?? ""}
                  name="certificationLines"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Awards (one per line)", "奖项（每行一条）")}
                </span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.awards.join("\n") ?? ""}
                  name="awardLines"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.links.linkedIn ?? ""}
                name="linkedInUrl"
                placeholder={t("LinkedIn URL", "LinkedIn 链接")}
                type="text"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.links.github ?? ""}
                name="githubUrl"
                placeholder={t("GitHub URL", "GitHub 链接")}
                type="text"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.links.portfolio ?? ""}
                name="portfolioUrl"
                placeholder={t("Portfolio URL", "作品集链接")}
                type="text"
              />
            </div>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="volunteerExperience"
              placeholder={t("Volunteer experience (optional)", "志愿经历（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="leadershipExperience"
              placeholder={t("Leadership experience (optional)", "领导力经历（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="extracurriculars"
              placeholder={t("Extracurriculars (optional)", "课外活动（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="publicationsLines"
              placeholder={t("Publications (one per line, optional)", "论文/出版物（每行一条，可选）")}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {t("Keywords to emphasize (optional)", "重点关键词（可选）")}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.keywordEmphasis ?? ""}
                name="keywordEmphasis"
                placeholder={t("Machine learning, distributed systems", "机器学习、分布式系统")}
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {t("Industries of interest (optional)", "目标行业（可选）")}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.industryPreference ?? ""}
                name="industryPreference"
                placeholder={t("Fintech, healthtech, SaaS", "金融科技、医疗科技、SaaS")}
                type="text"
              />
            </label>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={profile?.notes ?? ""}
              name="resumeNotes"
              placeholder={t("Any other context you'd like reflected in the resume", "其他希望在简历中体现的信息")}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=5"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="7">
                {t("Continue to target role", "继续到目标岗位信息")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 7 ? (
        <Card className={stepCardClass}>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/55 p-4">
            <p className="text-sm font-medium text-slate-900">
              {t("Parse from public job URL", "从公开岗位链接自动解析")}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {t(
                "Paste a public job posting URL. ResumeForge will fetch the page, extract structured fields with AI, then you can edit everything below.",
                "粘贴公开岗位链接。ResumeForge 会抓取页面并用 AI 提取结构化字段，你可在下方继续编辑。",
              )}
            </p>
            <form action={parseJobPostingUrlAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input name="currentStep" type="hidden" value="7" />
              <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
              <input
                className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                defaultValue={jobDescription?.briefData?.sourceUrl ?? ""}
                name="jobPostingUrl"
                placeholder={t("https://company.com/careers/job-posting", "https://company.com/careers/job-posting")}
                type="url"
              />
              <SubmitButton pendingLabel={t("Parsing...", "解析中...")}>
                {t("Parse job posting", "解析岗位链接")}
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              {t(
                "If parsing fails due to anti-bot pages, paste job description text manually below.",
                "若因反爬策略无法解析，请直接在下方粘贴岗位描述文本。",
              )}
            </p>
          </div>

          <p className="text-sm text-slate-600">
            {t(
              "Add role context manually or refine the parsed results. More detail improves tailoring quality.",
              "可手动补充岗位信息，或基于解析结果继续完善。信息越完整，后续定向优化越准确。",
            )}
          </p>
          <form action={saveJobDescriptionAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="7" />
            <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="sourceUrl" type="hidden" value={jobDescription?.briefData?.sourceUrl ?? ""} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Source job URL (optional)", "岗位来源链接（可选）")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.briefData?.sourceUrl ?? ""}
                  name="sourceUrl"
                  placeholder={t("Paste the posting URL for traceability", "保留岗位链接便于追踪来源")}
                  type="url"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Target company (optional)", "目标公司（可选）")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.company ?? ""}
                  name="company"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Target role", "目标岗位")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.role ?? ""}
                  name="role"
                  placeholder={t("e.g. Software Engineer", "例如：后端工程师")}
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Target location (optional)", "目标地点（可选）")}
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.location ?? ""}
                  name="location"
                  type="text"
                />
              </label>
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">
                  {t("Employment type (optional)", "雇佣类型（可选）")}
                </span>
                <SegmentedOptionGroup
                  className="md:grid-cols-4"
                  defaultValue={jobDescription?.briefData?.employmentType ?? ""}
                  name="employmentType"
                  options={[
                    { value: "", label: t("Not specified", "未指定") },
                    { value: "Full-time", label: t("Full-time", "全职") },
                    { value: "Internship", label: t("Internship", "实习") },
                    { value: "Part-time", label: t("Part-time", "兼职") },
                    { value: "Contract", label: t("Contract", "合同制") },
                    { value: "Temporary", label: t("Temporary", "临时") },
                    { value: "Research", label: t("Research", "研究") },
                    { value: "Other", label: t("Other", "其他") },
                  ]}
                />
              </div>
            </div>
            <textarea
              className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.description ?? ""}
              name="description"
              placeholder={t(
                "Full job description text (optional but recommended)",
                "完整岗位描述文本（可选但强烈推荐）",
              )}
            />
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                {t("Seniority level (optional)", "级别要求（可选）")}
              </span>
              <SegmentedOptionGroup
                className="md:grid-cols-4"
                defaultValue={jobDescription?.briefData?.seniorityLevel ?? ""}
                name="seniorityLevel"
                options={[
                  { value: "", label: t("Not specified", "未指定") },
                  { value: "Entry", label: t("Entry", "初级") },
                  { value: "Mid", label: t("Mid", "中级") },
                  { value: "Senior", label: t("Senior", "高级") },
                ]}
              />
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                {t("Work mode (optional)", "办公模式（可选）")}
              </span>
              <SegmentedOptionGroup
                defaultValue={jobDescription?.briefData?.workMode ?? ""}
                name="workMode"
                options={[
                  { value: "", label: t("Not specified", "未指定") },
                  { value: "Onsite", label: t("Onsite", "现场") },
                  { value: "Hybrid", label: t("Hybrid", "混合") },
                  { value: "Remote", label: t("Remote", "远程") },
                ]}
              />
            </div>
            <TokenInputField
              defaultValue={jobDescription?.briefData?.topRequiredSkills.join(", ") ?? ""}
              helperText={t("Use concise skill tags.", "建议使用简洁技能标签。")}
              label={t("Key required skills (optional)", "关键必备技能（可选）")}
              name="topRequiredSkills"
              placeholder={t("Node.js, SQL, API design", "Node.js、SQL、API 设计")}
            />
            <TokenInputField
              defaultValue={jobDescription?.briefData?.emphasizeKeywords.join(", ") ?? ""}
              helperText={t("These keywords will be emphasized during tailoring.", "这些关键词会在定向优化时重点强化。")}
              label={t("Keywords to emphasize (optional)", "强调关键词（可选）")}
              name="emphasizeKeywords"
              placeholder={t("Distributed systems, ownership", "分布式系统、Owner 意识")}
            />
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.briefData?.responsibilitiesSummary ?? ""}
              name="responsibilitiesSummary"
              placeholder={t("Hiring priorities / role emphasis (optional)", "招聘重点 / 岗位侧重点（可选）")}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=6"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="8">
                {t("Continue to output studio", "继续到输出工作台")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 8 ? (
        <Card className={stepCardClass}>
          <p className="text-sm text-slate-600">
            {t(
              "Output Studio controls language, template, and generation style. Revisit any time before generating.",
              "输出工作台用于配置语言、模板和生成风格。生成前可随时回到此处修改。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="8" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <div className="rounded-2xl border border-slate-200/65 bg-slate-50/45 p-4">
              <p className="text-sm font-medium text-slate-900">
                {pickText(uiLanguage, "Output language", "输出语言")}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {pickText(
                  uiLanguage,
                  "Choose the final language of the generated resume.",
                  "选择最终生成简历的语言。",
                )}
              </p>
              <SegmentedOptionGroup
                className="mt-3 grid-cols-2"
                defaultValue={profile?.preferences.outputLanguage || "en"}
                name="outputLanguage"
                options={[
                  {
                    value: "en",
                    label: t("English", "英文"),
                    hint: t("U.S. recruiter default", "美区投递默认"),
                  },
                  {
                    value: "zh",
                    label: t("Chinese", "中文"),
                    hint: t("Chinese output", "中文简历输出"),
                  },
                ]}
              />
            </div>

            <div className="rounded-2xl border border-slate-200/65 bg-slate-50/45 p-4">
              <p className="text-sm font-medium text-slate-900">
                {pickText(uiLanguage, "Generation style", "生成风格")}
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-600">
                    {pickText(uiLanguage, "Resume style", "简历主风格")}
                  </span>
                  <SegmentedOptionGroup
                    className="md:grid-cols-3"
                    defaultValue={profile?.preferences.resumeStyle ?? ""}
                    name="resumeStyle"
                    options={resumeStyleOptions.map((item) => ({
                      value: item.value,
                      label: pickText(uiLanguage, item.en, item.zh),
                    }))}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-600">
                    {pickText(uiLanguage, "Summary style (optional)", "摘要风格（可选）")}
                  </span>
                  <SegmentedOptionGroup
                    className="md:grid-cols-3"
                    defaultValue=""
                    name="summaryStyle"
                    options={summaryStyleOptions.map((item) => ({
                      value: item.value,
                      label: pickText(uiLanguage, item.en, item.zh),
                    }))}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-600">
                    {pickText(uiLanguage, "Page length preference", "页数偏好")}
                  </span>
                  <SegmentedOptionGroup
                    defaultValue=""
                    name="onePagePreference"
                    options={[
                      { value: "", label: pickText(uiLanguage, "Not specified", "未指定") },
                      { value: "prefer_one_page", label: pickText(uiLanguage, "Prefer one page", "优先一页") },
                      { value: "allow_two_pages", label: pickText(uiLanguage, "Allow two pages", "允许两页") },
                    ]}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-600">
                    {pickText(uiLanguage, "Tone preference", "语气偏好")}
                  </span>
                  <SegmentedOptionGroup
                    defaultValue=""
                    name="studentProfessionalPolish"
                    options={[
                      { value: "", label: pickText(uiLanguage, "Not specified", "未指定") },
                      { value: "student_friendly", label: pickText(uiLanguage, "Student-friendly", "学生友好") },
                      { value: "professional_polish", label: pickText(uiLanguage, "Professional polish", "专业强化") },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/65 bg-slate-50/45 p-4 text-xs text-slate-600">
              <p className="font-medium text-slate-800">
                {pickText(uiLanguage, "Template matching tip", "模板选择提示")}
              </p>
              <p className="mt-1">
                {pickText(
                  uiLanguage,
                  "ATS-heavy applications usually perform best with Classic ATS-safe. For portfolio-heavy roles, use Technical / product-focused.",
                  "若投递流程偏 ATS，优先使用“经典 ATS 安全”；若项目比重更高，可选“技术与产品导向”。",
                )}
              </p>
            </div>

            <TemplateGalleryField
              defaultTemplateId={profile?.preferences.templateId || "classic_ats"}
              templates={RESUME_TEMPLATES}
              uiLanguage={uiLanguage}
            />
            <TokenInputField
              helperText={t("Use tags for sections that should stand out.", "可用标签指定你希望重点突出的内容分段。")}
              label={pickText(uiLanguage, "Sections to emphasize (optional)", "重点强化分段（可选）")}
              name="sectionEmphasis"
              placeholder={pickText(uiLanguage, "Projects, experience, leadership", "项目、经历、领导力")}
            />
            <TokenInputField
              defaultValue={profile?.preferences.keywordEmphasis ?? ""}
              helperText={t("These keywords influence rewrite and tailoring focus.", "这些关键词会影响改写与定向优化重点。")}
              label={pickText(uiLanguage, "Keyword emphasis (optional)", "关键词强调（可选）")}
              name="keywordEmphasis"
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {pickText(uiLanguage, "Industry/job family preference (optional)", "行业/岗位族偏好（可选）")}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.industryPreference ?? ""}
                name="industryPreference"
                type="text"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=7"
              >
                <ArrowLeft className="h-4 w-4" />
                {pickText(uiLanguage, "Back", "返回")}
              </Link>
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {pickText(uiLanguage, "Save output settings", "保存输出设置")}
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel={t("Saving...", "正在保存...")} value="9">
                {pickText(uiLanguage, "Continue to review", "继续到复核")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 9 ? (
        <Card className="space-y-6 border-slate-200/70 bg-white/78 p-6 shadow-[0_30px_75px_-62px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <div>
            <p className="text-sm text-slate-600">
              {pickText(
                uiLanguage,
                "Review what you entered, then generate your first resume draft.",
                "先复核你已填写的信息，再生成首个简历草稿。",
              )}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/65 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">{t("Collected sections", "已收集分段")}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {[
                  { done: hasStep1, label: t("Basic identity", "基础身份信息") },
                  { done: hasStep2, label: t("Education", "教育背景") },
                  { done: hasStep3, label: t("Experience", "工作经历") },
                  { done: hasStep4, label: t("Projects", "项目经历") },
                  { done: hasStep5, label: t("Skills", "技能") },
                  { done: hasStep7, label: t("Target role", "目标岗位") },
                ].map((item) => (
                  <li className="flex items-center justify-between gap-3" key={item.label}>
                    <span>{item.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        item.done
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200/70 text-slate-600",
                      )}
                    >
                      {item.done ? t("Complete", "完成") : t("Pending", "待补充")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200/65 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {t("Missing info that can improve quality", "可补充信息（可提升质量）")}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {!profile?.professionalSummary ? <li>• {t("Add a professional summary.", "建议补充职业摘要。")}</li> : null}
                {!hasStep3 ? <li>• {t("Add at least one experience entry.", "至少补充一条工作/实习经历。")}</li> : null}
                {!resume?.parsed.experienceBullets.some((bullet) => /\d/.test(bullet)) ? (
                  <li>• {t("Include quantified outcomes when possible.", "尽量补充可量化成果。")}</li>
                ) : null}
                {!jobDescription?.description ? <li>• {t("Add full job description text for better tailoring.", "建议补充完整岗位描述以提升匹配。")}</li> : null}
                {!profile?.links.linkedIn ? <li>• {t("Add LinkedIn URL (optional but useful).", "建议补充 LinkedIn 链接（可选）。")}</li> : null}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
              href="/dashboard/flow/build?step=8"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Back", "返回")}
            </Link>
            <form action={saveResumeAction}>
              <input name="currentStep" type="hidden" value="9" />
              <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
              <input name="intakeMode" type="hidden" value="guided" />
              <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />
              <SubmitButton name="intent" pendingLabel={t("Saving draft...", "正在保存草稿...")} value="draft" variant="outline">
                {t("Save draft", "保存草稿")}
              </SubmitButton>
            </form>
            <form action={generateBuildDraftAction}>
              <input name="currentStep" type="hidden" value="10" />
              <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
              <SubmitButton pendingLabel={t("Generating draft...", "正在生成草稿...")}>
                {t("Generate resume now", "立即生成简历")}
              </SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      {step === 10 ? (
        <Card className="space-y-6 border-slate-200/70 bg-white/78 p-6 shadow-[0_30px_75px_-62px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {pickText(uiLanguage, "Generated resume draft", "已生成简历草稿")}
              </h2>
              <p className="text-sm text-slate-600">
                {pickText(
                  uiLanguage,
                  "Preview, edit, regenerate, and export from here.",
                  "可在此预览、编辑、重新生成并导出。",
                )}
              </p>
            </div>
          </div>

          {!hasGeneratedDraft ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-sm font-semibold">
                {pickText(uiLanguage, "No generated draft yet", "尚未生成草稿")}
              </p>
              <p className="mt-1 text-sm">
                {pickText(
                  uiLanguage,
                  "Generate from Step 9 to unlock preview and export.",
                  "请先在第 9 步生成，随后即可预览与导出。",
                )}
              </p>
              <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/flow/build?step=9">
                {pickText(uiLanguage, "Go to review step", "前往复核步骤")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {previewModel ? <ResumePreview model={previewModel} /> : null}

              <div className="rounded-2xl border border-slate-200/65 bg-slate-50/70 p-4 text-sm text-slate-700">
                <p className="font-medium">
                  {pickText(uiLanguage, "Current output settings", "当前输出设置")}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {pickText(uiLanguage, "Language", "语言")}: {outputLanguage === "zh" ? "中文" : "English"} ·{" "}
                  {pickText(uiLanguage, "Template", "模板")}:{" "}
                  {(RESUME_TEMPLATES.find((item) => item.id === templateId)?.name[
                    uiLanguage === "zh" ? "zh" : "en"
                  ]) ?? templateId}
                </p>
              </div>

              {draftQualityNotes.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-medium">
                    {pickText(uiLanguage, "AI quality notes", "AI 质量提示")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {draftQualityNotes.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">
                  {pickText(uiLanguage, "Jump back and edit any section", "可随时回跳编辑任意分段")}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {pickText(
                    uiLanguage,
                    "Update content or output settings, then regenerate from this workspace.",
                    "先修改内容或输出设置，再回到此处重生成。",
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {steps.slice(0, 8).map((item) => (
                    <Link
                      className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 hover:bg-white"
                      href={`/dashboard/flow/build?step=${item.number}`}
                      key={`jump_${item.number}`}
                    >
                      {t(`Step ${item.number}`, `第 ${item.number} 步`)}
                    </Link>
                  ))}
                </div>
              </div>

              <form action={saveResumeAction} className="space-y-3">
                <input name="currentStep" type="hidden" value="10" />
                <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
                <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
                <input name="intakeMode" type="hidden" value="guided" />
                <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{t("Edit draft text", "编辑草稿内容")}</span>
                  <textarea
                    className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7"
                    defaultValue={resume?.originalText ?? ""}
                    name="quickResumeText"
                  />
                </label>
                <SubmitButton pendingLabel={t("Saving draft...", "正在保存草稿...")} variant="outline">
                  {pickText(uiLanguage, "Save edited draft", "保存编辑后的草稿")}
                </SubmitButton>
              </form>

              <form action={generateBuildDraftAction}>
                <input name="currentStep" type="hidden" value="10" />
                <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
                <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
                <SubmitButton pendingLabel={t("Regenerating...", "正在重新生成...")} variant="outline">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {pickText(uiLanguage, "Regenerate", "重新生成")}
                  </span>
                </SubmitButton>
              </form>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {originalVersion ? (
                  <>
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={`/api/export?versionId=${originalVersion.id}&format=pdf${exportSuffix}`}
                    >
                      <Download className="h-4 w-4" />
                      {pickText(uiLanguage, "Download PDF", "下载 PDF")}
                    </a>
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={`/api/export?versionId=${originalVersion.id}&format=txt${exportSuffix}`}
                    >
                      <Download className="h-4 w-4" />
                      {pickText(uiLanguage, "Download TXT", "下载 TXT")}
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    {pickText(uiLanguage, "Export will appear after draft generation.", "生成草稿后将显示导出入口。")}
                  </p>
                )}
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  href="/dashboard/versions"
                >
                  {pickText(uiLanguage, "Open versions", "查看版本")}
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                  href="/dashboard/analysis"
                >
                  {pickText(uiLanguage, "Continue refining", "继续优化")}
                </Link>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
              href="/dashboard/flow/build?step=9"
            >
              <ArrowLeft className="h-4 w-4" />
              {pickText(uiLanguage, "Back to review", "返回复核")}
            </Link>
          </div>
        </Card>
      ) : null}
        </div>
        <aside className="xl:sticky xl:top-24 xl:h-fit">
          <div className="rf-surface rounded-[24px] p-4">
            {step < 7 ? (
              <>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {t("Workspace guidance", "工作区提示")}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {t(
                    "Focus on profile content first. Output settings and template studio unlock after target role setup.",
                    "先完善简历内容。完成目标岗位信息后，再进入输出设置与模板工作台。",
                  )}
                </p>
                <div className="mt-3 rounded-2xl border border-slate-600/45 bg-slate-900/76 p-3 text-xs text-slate-300">
                  <p>
                    {t("Recommended next", "推荐下一步")}：{steps[firstIncomplete - 1]?.title}
                  </p>
                  <p className="mt-1">
                    {t("Overall progress", "整体进度")}：{progressPercent}%
                  </p>
                </div>
                <Link
                  className="rf-nav-pill mt-3 w-full justify-between rounded-xl px-3 py-2 text-xs"
                  data-state="inactive"
                  href={`/dashboard/flow/build?step=${firstIncomplete}`}
                >
                  <span>{t("Go to recommended step", "前往推荐步骤")}</span>
                  <ArrowRight className="rf-nav-pill-icon h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{t("Output Studio", "输出工作台")}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  {t(
                    "Configure output language, template, and generation style before producing your draft.",
                    "在生成草稿前，配置输出语言、模板与生成风格。",
                  )}
                </p>
                <div className="mt-3 space-y-1 rounded-2xl border border-slate-600/45 bg-slate-900/76 p-3 text-xs text-slate-300">
                  <p>
                    {t("Current language", "当前语言")}：{outputLanguage === "zh" ? t("Chinese", "中文") : t("English", "英文")}
                  </p>
                  <p>
                    {t("Current template", "当前模板")}：
                    {(RESUME_TEMPLATES.find((item) => item.id === templateId)?.name[
                      uiLanguage === "zh" ? "zh" : "en"
                    ]) ?? templateId}
                  </p>
                </div>

                <div className="mt-3 grid gap-2">
                  <Link
                    className="rf-nav-pill w-full justify-between rounded-xl px-3 py-2 text-xs"
                    data-state={step === 8 ? "active" : "inactive"}
                    href="/dashboard/flow/build?step=8"
                  >
                    <span>{t("Open output settings", "打开输出设置")}</span>
                    <ArrowRight className="rf-nav-pill-icon h-3.5 w-3.5" />
                  </Link>
                  <Link
                    className="rf-nav-pill w-full justify-between rounded-xl px-3 py-2 text-xs"
                    data-state={step === 9 ? "active" : "inactive"}
                    href="/dashboard/flow/build?step=9"
                  >
                    <span>{t("Review inputs", "复核输入")}</span>
                    <ArrowRight className="rf-nav-pill-icon h-3.5 w-3.5" />
                  </Link>
                  <Link
                    className="rf-nav-pill w-full justify-between rounded-xl px-3 py-2 text-xs"
                    data-state={step === 10 ? "active" : "inactive"}
                    href="/dashboard/flow/build?step=10"
                  >
                    <span>{t("Generated result", "生成结果")}</span>
                    <ArrowRight className="rf-nav-pill-icon h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>
        </div>
      </Reveal>
    </div>
  );
}
