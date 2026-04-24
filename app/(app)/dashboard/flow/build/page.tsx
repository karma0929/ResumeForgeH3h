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
import { FieldHelp } from "@/components/ui/field-help";
import { LocationField } from "@/components/ui/location-field";
import { MonthField } from "@/components/ui/month-field";
import { MonthRangeField } from "@/components/ui/month-range-field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { SegmentedOptionGroup } from "@/components/ui/segmented-option-group";
import {
  SkillsLibraryField,
  type SkillsLibraryGroup,
} from "@/components/ui/skills-library-field";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { TokenInputField } from "@/components/ui/token-input-field";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import {
  generateBuildDraftAction,
  summarizeTargetRoleAction,
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

function parseEntryCount(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(3, parsed));
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
  const projectUrl = (bodyParts.find((part) => part.startsWith("Project link:")) ?? "")
    .replace("Project link:", "")
    .trim();
  const githubUrl = (bodyParts.find((part) => part.startsWith("GitHub:")) ?? "")
    .replace("GitHub:", "")
    .trim();
  const demoUrl = (bodyParts.find((part) => part.startsWith("Demo:")) ?? "")
    .replace("Demo:", "")
    .trim();

  return {
    name: headlineParts[0] ?? "",
    role: (headlineParts.find((part) => part.startsWith("Role:")) ?? "").replace("Role:", "").trim(),
    dates: headlineParts.find((part) => !part.startsWith("Role:") && part !== (headlineParts[0] ?? "")) ?? "",
    technologies: (bodyParts.find((part) => part.startsWith("Technologies:")) ?? "")
      .replace("Technologies:", "")
      .trim(),
    description:
      bodyParts.find(
        (part) =>
          !part.startsWith("Technologies:") &&
          !part.startsWith("Impact:") &&
          !part.startsWith("Project link:") &&
          !part.startsWith("GitHub:") &&
          !part.startsWith("Demo:"),
      ) ?? "",
    impact: (bodyParts.find((part) => part.startsWith("Impact:")) ?? "").replace("Impact:", "").trim(),
    projectUrl,
    githubUrl,
    demoUrl,
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
    title: { en: "Style and output", zh: "风格与输出" },
    description: { en: "Pick a simple style and output format before generation.", zh: "在生成前选择简洁风格与输出格式。" },
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

const summaryStyleOptions = [
  { value: "", en: "Not specified", zh: "未指定" },
  { value: "concise", en: "Concise", zh: "简洁" },
  { value: "narrative", en: "Narrative", zh: "叙事型" },
  { value: "impact_first", en: "Impact-first", zh: "成果优先" },
  { value: "technical", en: "Technical", zh: "技术型" },
  { value: "recruiter_friendly", en: "Recruiter-friendly", zh: "招聘友好" },
];

const skillLibraryGroups: SkillsLibraryGroup[] = [
  {
    id: "languages",
    label: { en: "Languages", zh: "语言" },
    items: ["Python", "JavaScript", "TypeScript", "Java", "Go", "C++", "SQL", "R", "MATLAB", "Swift"],
  },
  {
    id: "frameworks",
    label: { en: "Frameworks", zh: "框架" },
    items: ["React", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring Boot", "Vue", "Angular", "FastAPI"],
  },
  {
    id: "tools",
    label: { en: "Tools", zh: "工具" },
    items: ["AWS", "Docker", "Kubernetes", "GitHub Actions", "Terraform", "PostgreSQL", "Redis", "Figma", "Jira", "Linux"],
  },
  {
    id: "soft",
    label: { en: "Soft skills", zh: "软技能" },
    items: ["Communication", "Cross-functional collaboration", "Stakeholder management", "Problem solving", "Ownership", "Mentoring"],
  },
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
            title: t("Target role summarized", "目标岗位已总结"),
            description: t(
              "Structured fields are ready below. Review and edit before saving.",
              "已生成结构化岗位简报，请在下方复核并按需修改后保存。",
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
  const educationCount = parseEntryCount(
    queryValue(params, "eduCount"),
    Math.max(1, Math.min(3, parsedEducation.length || 1)),
  );
  const experienceCount = parseEntryCount(
    queryValue(params, "expCount"),
    Math.max(1, Math.min(3, profile?.workExperiences.length || 1)),
  );
  const projectCount = parseEntryCount(
    queryValue(params, "projectCount"),
    Math.max(1, Math.min(3, parsedProjects.length || 1)),
  );
  const outputLanguage = profile?.preferences.outputLanguage || "en";
  const templateId = profile?.preferences.templateId || "classic_ats";
  const buildStepHref = (
    targetStep: number,
    extra?: Record<string, string | number | undefined>,
  ) => {
    const search = new URLSearchParams({ step: String(targetStep) });
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null && `${value}`.length > 0) {
          search.set(key, String(value));
        }
      }
    }
    return `/dashboard/flow/build?${search.toString()}`;
  };
  const stepCardClass = "space-y-5 border-slate-600/45 bg-slate-900/72 p-6 shadow-[0_26px_60px_-45px_rgba(15,23,42,0.78)] backdrop-blur-sm";
  const fieldClass =
    "w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500";
  const fieldMutedClass =
    "w-full rounded-2xl border border-slate-700/65 bg-slate-900/72 px-4 py-3 text-sm text-slate-400";
  const sectionSubTitleClass = "mb-2 flex items-center gap-2 text-sm font-medium text-slate-200";
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
          <p className="text-sm text-slate-300">
            {t(
              "Tell us the essentials. ResumeForge will infer structure and help polish wording later.",
              "先告诉系统核心信息，后续由 ResumeForge 帮你推断结构并优化表达。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="1" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <label className="block">
              <span className={sectionSubTitleClass}>{t("Full name", "姓名")}</span>
              <input
                className={fieldClass}
                defaultValue={profile?.basicProfile.fullName ?? snapshot.user.name}
                name="fullName"
                type="text"
              />
            </label>
            <label className="block">
              <span className={sectionSubTitleClass}>
                {t("Email (from account)", "邮箱（来自账号）")}
              </span>
              <input
                className={fieldMutedClass}
                defaultValue={snapshot.user.email}
                disabled
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={sectionSubTitleClass}>{t("Current title", "当前职位")}</span>
                <input
                  className={fieldClass}
                  defaultValue={profile?.basicProfile.currentTitle ?? snapshot.user.headline}
                  name="currentTitle"
                  placeholder={t("e.g. Software Engineer Intern", "例如：后端工程师 / 数据分析师")}
                  type="text"
                />
              </label>
              <label className="block">
                <span className={sectionSubTitleClass}>{t("Desired title", "目标职位")}</span>
                <input
                  className={fieldClass}
                  defaultValue={profile?.basicProfile.targetTitle ?? snapshot.user.targetRole}
                  name="targetTitle"
                  placeholder={t("Role you want next", "你希望投递的岗位")}
                  type="text"
                />
              </label>
              <div className="md:col-span-2">
                <LocationField
                  defaultValue={profile?.basicProfile.location ?? snapshot.user.location}
                  helperText={t(
                    "Choose country, then region/state, then city. If unavailable, type directly.",
                    "先选国家，再选州/省，最后填写城市。没有选项时可直接输入。",
                  )}
                  label={t("Location", "地点")}
                  name="profileLocation"
                  uiLanguage={uiLanguage}
                />
              </div>
              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Work authorization (optional)", "工作签证状态（可选）")}
                </span>
                <input
                  className={fieldClass}
                  defaultValue={profile?.basicProfile.workAuthorization ?? ""}
                  name="workAuthorization"
                  placeholder={t("e.g. F-1 OPT, H-1B sponsorship required", "例如：F-1 OPT，需要 H-1B sponsor")}
                  type="text"
                />
              </label>
              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Years of experience (optional)", "工作年限（可选）")}
                </span>
                <input
                  className={fieldClass}
                  defaultValue={profile?.basicProfile.yearsExperience ?? ""}
                  name="yearsExperience"
                  placeholder={t("e.g. 2 years", "例如：2 年")}
                  type="text"
                />
              </label>
              <div className="md:col-span-2">
                <span className={sectionSubTitleClass}>
                  {t("Career level (optional)", "职业级别（可选）")}
                </span>
                <select
                  className={fieldClass}
                  defaultValue={profile?.basicProfile.careerLevel ?? ""}
                  name="careerLevel"
                >
                  <option value="">{t("Not specified", "未指定")}</option>
                  <option value="student">{t("Student", "在校生")}</option>
                  <option value="internship_candidate">{t("Internship Candidate", "实习候选人")}</option>
                  <option value="student_new_grad">{t("New Grad", "应届生")}</option>
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
          <p className="text-sm text-slate-300">
            {t(
              "Add one education entry first. You can add another only when needed.",
              "先填写一条教育经历；只有需要时再添加下一条。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="2" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {Array.from({ length: educationCount }, (_, idx) => idx + 1).map((index) => {
              const item = parsedEducation[index - 1];
              return (
                <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-100">{t("Education entry", "教育经历")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className={fieldClass}
                      defaultValue={item?.school ?? ""}
                      name={`edu${index}_school`}
                      placeholder={t("School", "学校")}
                      type="text"
                    />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-300">{t("Degree", "学位")}</span>
                      <select
                        className={fieldClass}
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
                      className={fieldClass}
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
                      className={fieldClass}
                      defaultValue={item?.gpa ?? ""}
                      name={`edu${index}_gpa`}
                      placeholder={t("GPA (optional)", "GPA（可选）")}
                      type="text"
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.honors ?? ""}
                      name={`edu${index}_honors`}
                      placeholder={t("Honors (optional)", "荣誉（可选）")}
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.coursework ?? ""}
                    name={`edu${index}_coursework`}
                    placeholder={t("Relevant coursework (optional)", "相关课程（可选）")}
                  />
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {educationCount < 3 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-100 hover:border-cyan-300/60"
                  href={buildStepHref(2, { eduCount: educationCount + 1 })}
                >
                  {t("+ Add another education entry", "+ 添加一条教育经历")}
                </Link>
              ) : null}
              {educationCount > 1 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-300 hover:border-slate-300/70"
                  href={buildStepHref(2, { eduCount: educationCount - 1 })}
                >
                  {t("Show fewer entries", "减少显示条目")}
                </Link>
              ) : null}
            </div>

            <p className="text-xs text-slate-400">{t("You can leave entries blank and return later.", "可先留空，后续再补充。")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(1)}
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
          <p className="text-sm text-slate-300">
            {t(
              "Add one experience entry at a time. ResumeForge can help rewrite weak bullets later.",
              "每次先完成一条经历。后续可用 ResumeForge 自动强化薄弱表述。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="3" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {Array.from({ length: experienceCount }, (_, idx) => idx + 1).map((index) => {
              const item = profile?.workExperiences[index - 1];
              return (
                <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-100">{t("Experience entry", "经历条目")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className={fieldClass}
                      defaultValue={item?.company ?? ""}
                      name={`exp${index}_company`}
                      placeholder={t("Company", "公司")}
                      type="text"
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.title ?? ""}
                      name={`exp${index}_title`}
                      placeholder={t("Role/title", "职位")}
                      type="text"
                    />
                    <LocationField
                      defaultValue={item?.location ?? ""}
                      name={`exp${index}_location`}
                      label={t("Location", "地点")}
                      uiLanguage={uiLanguage}
                    />
                    <MonthRangeField
                      className="md:col-span-2"
                      defaultValue={item?.dates ?? ""}
                      endLabel={t("End month", "结束月份")}
                      name={`exp${index}_dates`}
                      presentLabel={t("Present", "至今")}
                      startLabel={t("Start month", "开始月份")}
                    />
                  </div>
                  <label className="mt-3 block">
                    <span className={sectionSubTitleClass}>
                      {t("Responsibilities", "职责描述")}
                      <FieldHelp
                        text={t(
                          "Describe scope and ownership. Example: Led migration of payment API with 4 engineers.",
                          "描述职责范围和 ownership，例如：主导支付 API 迁移并协调 4 名工程师。",
                        )}
                      />
                    </span>
                    <textarea
                    className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.responsibilities ?? ""}
                    name={`exp${index}_responsibilities`}
                    placeholder={t("What did you own and execute?", "你负责并推动了什么？")}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className={sectionSubTitleClass}>
                      {t("Achievements / outcomes", "成果 / 结果")}
                      <FieldHelp
                        text={t(
                          "Focus on change after your work. Example: Increased activation from 42% to 58%.",
                          "强调工作前后变化。例如：将激活率从 42% 提升到 58%。",
                        )}
                      />
                    </span>
                    <textarea
                    className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.achievements ?? ""}
                    name={`exp${index}_achievements`}
                    placeholder={t("What improved because of your work?", "你的工作带来了什么改进？")}
                    />
                  </label>
                  <input
                    className="mt-3 w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.quantifiedImpact ?? ""}
                    name={`exp${index}_quantifiedImpact`}
                    placeholder={t("Quantified impact (optional): % / time / cost / users", "量化影响（可选）：百分比 / 时间 / 成本 / 用户规模")}
                    type="text"
                  />
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {experienceCount < 3 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-100 hover:border-cyan-300/60"
                  href={buildStepHref(3, { expCount: experienceCount + 1 })}
                >
                  {t("+ Add another experience", "+ 添加一条经历")}
                </Link>
              ) : null}
              {experienceCount > 1 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-300 hover:border-slate-300/70"
                  href={buildStepHref(3, { expCount: experienceCount - 1 })}
                >
                  {t("Show fewer entries", "减少显示条目")}
                </Link>
              ) : null}
            </div>

            <p className="text-xs text-slate-400">
              {t(
                "Example: Reduced processing time by 25% by automating weekly report generation.",
                "示例：通过自动化周报流程，将处理时间缩短 25%。",
              )}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(2, { eduCount: educationCount })}
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
          <p className="text-sm text-slate-300">
            {t("Show projects that demonstrate practical skills and impact.", "填写能体现实战能力与影响力的项目经历。")}
          </p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="4" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {Array.from({ length: projectCount }, (_, idx) => idx + 1).map((index) => {
              const item = parsedProjects[index - 1];
              return (
                <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-100">{t("Project entry", "项目条目")} {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className={fieldClass}
                      defaultValue={item?.name ?? ""}
                      name={`project${index}_name`}
                      placeholder={t("Project name", "项目名称")}
                      type="text"
                    />
                    <input
                      className={fieldClass}
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
                      presentLabel={t("Present", "至今")}
                      startLabel={t("Start month", "开始月份")}
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.technologies ?? ""}
                      name={`project${index}_technologies`}
                      placeholder={t("Technologies", "技术栈")}
                      type="text"
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.projectUrl ?? ""}
                      name={`project${index}_projectUrl`}
                      placeholder={t("Project link (optional)", "项目链接（可选）")}
                      type="url"
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.githubUrl ?? ""}
                      name={`project${index}_githubUrl`}
                      placeholder={t("GitHub link (optional)", "GitHub 链接（可选）")}
                      type="url"
                    />
                    <input
                      className={fieldClass}
                      defaultValue={item?.demoUrl ?? ""}
                      name={`project${index}_demoUrl`}
                      placeholder={t("Demo / portfolio link (optional)", "演示 / 作品集链接（可选）")}
                      type="url"
                    />
                  </div>
                  <label className="mt-3 block">
                    <span className={sectionSubTitleClass}>
                      {t("Project description", "项目描述")}
                      <FieldHelp
                        text={t(
                          "Explain problem, approach, and your role.",
                          "建议描述问题背景、解决方法和你的角色贡献。",
                        )}
                      />
                    </span>
                    <textarea
                    className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.description ?? ""}
                    name={`project${index}_description`}
                    placeholder={t("Project description", "项目描述")}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className={sectionSubTitleClass}>
                      {t("Impact / outcome (optional)", "结果 / 影响（可选）")}
                      <FieldHelp
                        text={t(
                          "Include measurable results when possible: users, revenue, speed, quality.",
                          "尽量补充可衡量结果：用户规模、营收、效率、质量等。",
                        )}
                      />
                    </span>
                    <textarea
                    className="min-h-[80px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                    defaultValue={item?.impact ?? ""}
                    name={`project${index}_impact`}
                    placeholder={t("Impact / outcome (optional)", "结果/影响（可选）")}
                    />
                  </label>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2">
              {projectCount < 3 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-100 hover:border-cyan-300/60"
                  href={buildStepHref(4, { projectCount: projectCount + 1 })}
                >
                  {t("+ Add another project", "+ 添加一个项目")}
                </Link>
              ) : null}
              {projectCount > 1 ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-500/55 bg-slate-900/72 px-3 text-xs font-medium text-slate-300 hover:border-slate-300/70"
                  href={buildStepHref(4, { projectCount: projectCount - 1 })}
                >
                  {t("Show fewer entries", "减少显示条目")}
                </Link>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(3, { expCount: experienceCount })}
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
          <p className="text-sm text-slate-300">
            {t(
              "Search and pick skills from the library. Add custom tags only when needed.",
              "优先从技能库选择，再按需补充自定义标签。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="5" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <SkillsLibraryField
              defaultValue={profile?.skills.join(", ") ?? ""}
              groups={skillLibraryGroups}
              helperText={t(
                "Choose skills you can prove in experience/projects. This list is used directly in generation.",
                "请选择你能在经历/项目中证明的技能。该列表会直接用于生成。",
              )}
              label={t("Skills and tools", "技能与工具")}
              name="skillsCsv"
              placeholder={t("Search skill or type custom...", "搜索技能或输入自定义...")}
              uiLanguage={uiLanguage}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(4, { projectCount })}
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
          <p className="text-sm text-slate-300">
            {t(
              "These are optional trust signals. Fill only what is real and useful.",
              "这些是可选加分信息，只填写真实且有价值的内容即可。",
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
                <span className={sectionSubTitleClass}>
                  {t("Certifications (one per line)", "证书（每行一条）")}
                </span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  defaultValue={profile?.certifications.join("\n") ?? ""}
                  name="certificationLines"
                />
              </label>
              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Awards (one per line)", "奖项（每行一条）")}
                </span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  defaultValue={profile?.awards.join("\n") ?? ""}
                  name="awardLines"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                className={fieldClass}
                defaultValue={profile?.links.linkedIn ?? ""}
                name="linkedInUrl"
                placeholder={t("LinkedIn URL", "LinkedIn 链接")}
                type="text"
              />
              <input
                className={fieldClass}
                defaultValue={profile?.links.github ?? ""}
                name="githubUrl"
                placeholder={t("GitHub URL", "GitHub 链接")}
                type="text"
              />
              <input
                className={fieldClass}
                defaultValue={profile?.links.portfolio ?? ""}
                name="portfolioUrl"
                placeholder={t("Portfolio URL", "作品集链接")}
                type="text"
              />
            </div>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              name="volunteerExperience"
              placeholder={t("Volunteer experience (optional)", "志愿经历（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              name="leadershipExperience"
              placeholder={t("Leadership experience (optional)", "领导力经历（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              name="extracurriculars"
              placeholder={t("Extracurriculars (optional)", "课外活动（可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              name="publicationsLines"
              placeholder={t("Publications (one per line, optional)", "论文/出版物（每行一条，可选）")}
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              defaultValue={profile?.notes ?? ""}
              name="resumeNotes"
              placeholder={t("Any other context you'd like reflected in the resume", "其他希望在简历中体现的信息")}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(5)}
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
          <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
            <p className="text-sm font-medium text-slate-100">
              {t("Create target role brief with AI", "用 AI 生成目标岗位简报")}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {t(
                "Use either a public job URL or pasted job text. ResumeForge will summarize and structure the role for you, then you only review/edit.",
                "你只需要提供岗位链接或粘贴岗位文本。ResumeForge 会自动总结并结构化，你只需复核和微调。",
              )}
            </p>
            <form action={summarizeTargetRoleAction} className="mt-3 space-y-3">
              <input name="currentStep" type="hidden" value="7" />
              <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />

              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Public job URL (optional)", "公开岗位链接（可选）")}
                </span>
                <input
                  className={fieldClass}
                  defaultValue={jobDescription?.briefData?.sourceUrl ?? ""}
                  name="jobPostingUrl"
                  placeholder={t("https://company.com/careers/software-engineer", "https://company.com/careers/software-engineer")}
                  type="url"
                />
              </label>

              <div className="relative py-1 text-center text-xs text-slate-400">
                <span className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/70" />
                <span className="relative bg-slate-900/72 px-3">
                  {t("or paste job description text", "或粘贴岗位描述文本")}
                </span>
              </div>

              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Job description text", "岗位描述文本")}
                </span>
                <textarea
                  className="min-h-[200px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  defaultValue={jobDescription?.description ?? ""}
                  name="jobDescriptionText"
                  placeholder={t(
                    "Paste the full role description here if URL is blocked or unavailable.",
                    "若链接无法访问或无公开链接，请将完整岗位描述粘贴在这里。",
                  )}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <SubmitButton pendingLabel={t("Summarizing...", "总结中...")}>
                  {t("Summarize with AI", "AI 生成岗位简报")}
                </SubmitButton>
                <p className="self-center text-xs text-slate-400">
                  {t(
                    "If URL parsing fails, pasted text will be used automatically.",
                    "若链接解析失败，系统会自动回退到粘贴文本进行总结。",
                  )}
                </p>
              </div>
            </form>
          </div>

          <form action={saveJobDescriptionAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="7" />
            <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="sourceUrl" type="hidden" value={jobDescription?.briefData?.sourceUrl ?? ""} />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  {t("Review AI-structured brief", "复核 AI 结构化岗位简报")}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {t(
                    "Only fix what is inaccurate. Keep this lightweight.",
                    "只修正不准确的信息，尽量保持轻量。",
                  )}
                </p>
              </div>
              <Badge className="border-cyan-400/45 bg-cyan-950/40 text-cyan-100">
                {t("Editable", "可编辑")}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Target company (optional)", "目标公司（可选）")}
                </span>
                <input
                  className={fieldClass}
                  defaultValue={jobDescription?.company ?? ""}
                  name="company"
                  type="text"
                />
              </label>
              <label className="block">
                <span className={sectionSubTitleClass}>
                  {t("Target role", "目标岗位")}
                </span>
                <input
                  className={fieldClass}
                  defaultValue={jobDescription?.role ?? ""}
                  name="role"
                  placeholder={t("e.g. Software Engineer", "例如：后端工程师")}
                  type="text"
                />
              </label>
              <LocationField
                defaultValue={jobDescription?.location ?? ""}
                helperText={t(
                  "If the posting only mentions country/remote, city can stay empty.",
                  "若岗位仅写国家/远程，城市可留空。",
                )}
                label={t("Target location (optional)", "目标地点（可选）")}
                name="location"
                uiLanguage={uiLanguage}
              />
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-200">
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
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-200">
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
                <span className="block text-sm font-medium text-slate-200">
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
            </div>
            <textarea
              className="min-h-[180px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              defaultValue={jobDescription?.description ?? ""}
              name="description"
              placeholder={t(
                "Cleaned job description text used for generation/analysis.",
                "用于生成与分析的岗位文本（已清洗）。",
              )}
            />
            <TokenInputField
              defaultValue={jobDescription?.briefData?.topRequiredSkills.join(", ") ?? ""}
              helperText={t("Use concise skill tags.", "建议使用简洁技能标签。")}
              label={t("Key required skills (optional)", "关键必备技能（可选）")}
              name="topRequiredSkills"
              placeholder={t("Node.js, SQL, API design", "Node.js、SQL、API 设计")}
            />
            <TokenInputField
              defaultValue={jobDescription?.briefData?.preferredSkills.join(", ") ?? ""}
              helperText={t("Optional plus-skills used for tailoring nuance.", "可选加分技能，用于更细粒度匹配。")}
              label={t("Preferred skills (optional)", "偏好技能（可选）")}
              name="preferredSkills"
              placeholder={t("Distributed tracing, ML Ops", "分布式追踪、MLOps")}
            />
            <TokenInputField
              defaultValue={jobDescription?.briefData?.emphasizeKeywords.join(", ") ?? ""}
              helperText={t("These keywords will be emphasized during tailoring.", "这些关键词会在定向优化时重点强化。")}
              label={t("Keywords to emphasize (optional)", "强调关键词（可选）")}
              name="emphasizeKeywords"
              placeholder={t("Distributed systems, ownership", "分布式系统、Owner 意识")}
            />
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              defaultValue={jobDescription?.briefData?.responsibilitiesSummary ?? ""}
              name="responsibilitiesSummary"
              placeholder={t("Concise hiring focus summary (editable)", "岗位重点摘要（可编辑）")}
            />

            <details className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-100">
                {t("Advanced role signals (optional)", "高级岗位信号（可选）")}
              </summary>
              <div className="mt-3 space-y-3">
                <input
                  className={fieldClass}
                  defaultValue={jobDescription?.briefData?.industryDomain ?? ""}
                  name="industryDomain"
                  placeholder={t("Industry/domain (optional)", "行业领域（可选）")}
                  type="text"
                />
                <input
                  className={fieldClass}
                  defaultValue={jobDescription?.briefData?.salaryRange ?? ""}
                  name="salaryRange"
                  placeholder={t("Salary range (optional)", "薪资范围（可选）")}
                  type="text"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className={fieldClass}
                    defaultValue={jobDescription?.briefData?.atsIntensity ?? ""}
                    name="atsIntensity"
                    placeholder={t("ATS intensity (optional)", "ATS 强度（可选）")}
                    type="text"
                  />
                  <input
                    className={fieldClass}
                    defaultValue={jobDescription?.briefData?.technicalIntensity ?? ""}
                    name="technicalIntensity"
                    placeholder={t("Technical intensity (optional)", "技术强度（可选）")}
                    type="text"
                  />
                </div>
                <textarea
                  className="min-h-[100px] w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  defaultValue={jobDescription?.briefData?.recruiterNotes ?? ""}
                  name="recruiterNotes"
                  placeholder={t("Recruiter / hiring manager notes (optional)", "招聘方备注（可选）")}
                />
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(6)}
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
          <p className="text-sm text-slate-300">
            {t(
              "Keep output settings simple. You can always revisit before regeneration/export.",
              "输出设置保持简洁即可，生成和导出前都可以随时回改。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="8" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
              <p className="text-sm font-medium text-slate-100">
                {pickText(uiLanguage, "Output language", "输出语言")}
              </p>
              <p className="mt-1 text-xs text-slate-300">
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

            <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
              <p className="text-sm font-medium text-slate-100">
                {pickText(uiLanguage, "Generation style", "生成风格")}
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-300">
                    {pickText(uiLanguage, "Resume style", "简历主风格")}
                  </span>
                  <SegmentedOptionGroup
                    className="md:grid-cols-3"
                    defaultValue={profile?.preferences.resumeStyle ?? ""}
                    name="resumeStyle"
                    options={[
                      { value: "concise", label: pickText(uiLanguage, "Concise", "简洁") },
                      { value: "technical", label: pickText(uiLanguage, "Technical", "技术导向") },
                      { value: "recruiter_friendly", label: pickText(uiLanguage, "Recruiter-friendly", "招聘友好") },
                      { value: "achievement_focused", label: pickText(uiLanguage, "Results-focused", "成果导向") },
                      { value: "student_friendly", label: pickText(uiLanguage, "Student / New-grad", "学生 / 应届友好") },
                      { value: "leadership_focused", label: pickText(uiLanguage, "Leadership-oriented", "领导力导向") },
                    ]}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-xs font-medium text-slate-300">
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
                  <span className="mb-2 block text-xs font-medium text-slate-300">
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
                  <span className="mb-2 block text-xs font-medium text-slate-300">
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

            <div className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4 text-xs text-slate-300">
              <p className="font-medium text-slate-100">
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
            <details className="rounded-2xl border border-slate-600/45 bg-slate-900/72 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-100">
                {pickText(uiLanguage, "Advanced preferences (optional)", "高级偏好（可选）")}
              </summary>
              <div className="mt-3 space-y-3">
                <TokenInputField
                  helperText={t("Use only when you know exactly what should be emphasized.", "仅在你明确知道需要强化哪些关键词时填写。")}
                  label={pickText(uiLanguage, "Keyword emphasis (optional)", "关键词强调（可选）")}
                  name="keywordEmphasis"
                  defaultValue={profile?.preferences.keywordEmphasis ?? ""}
                />
                <TokenInputField
                  helperText={t("Optional tags for section focus.", "可选标签，用于分段强调。")}
                  label={pickText(uiLanguage, "Section emphasis (optional)", "分段强调（可选）")}
                  name="sectionEmphasis"
                  placeholder={pickText(uiLanguage, "Projects, leadership", "项目、领导力")}
                />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    {pickText(uiLanguage, "Industry preference (optional)", "行业偏好（可选）")}
                  </span>
                  <input
                    className={fieldClass}
                    defaultValue={profile?.preferences.industryPreference ?? ""}
                    name="industryPreference"
                    type="text"
                  />
                </label>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href={buildStepHref(7)}
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
        <Card className="space-y-6 border-slate-600/45 bg-slate-900/72 p-6 shadow-[0_26px_60px_-45px_rgba(15,23,42,0.78)] backdrop-blur-sm">
          <div>
            <p className="text-sm text-slate-300">
              {pickText(
                uiLanguage,
                "Review what you entered, then generate your first resume draft.",
                "先复核你已填写的信息，再生成首个简历草稿。",
              )}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-600/45 bg-slate-900/76 p-4">
              <p className="text-sm font-semibold text-slate-100">{t("Collected sections", "已收集分段")}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
                          ? "bg-emerald-950/40 text-emerald-100"
                          : "bg-slate-800 text-slate-300",
                      )}
                    >
                      {item.done ? t("Complete", "完成") : t("Pending", "待补充")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-600/45 bg-slate-900/76 p-4">
              <p className="text-sm font-semibold text-slate-100">
                {t("Missing info that can improve quality", "可补充信息（可提升质量）")}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
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
        <Card className="space-y-6 border-slate-600/45 bg-slate-900/72 p-6 shadow-[0_26px_60px_-45px_rgba(15,23,42,0.78)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-500/50 bg-slate-950/65 text-slate-100">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
                {pickText(uiLanguage, "Generated resume draft", "已生成简历草稿")}
              </h2>
              <p className="text-sm text-slate-300">
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
