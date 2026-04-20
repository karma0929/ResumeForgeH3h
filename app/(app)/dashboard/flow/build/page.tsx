import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import {
  generateBuildDraftAction,
  saveJobDescriptionAction,
  saveResumeAction,
} from "@/lib/actions/dashboard";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { buildResumeRenderModel, RESUME_TEMPLATES } from "@/lib/resume-render";

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
  const maxAccessibleStep = firstIncomplete;
  const requestedStep = parseStep(queryValue(params, "step"), maxAccessibleStep);
  const step = requestedStep > maxAccessibleStep ? maxAccessibleStep : requestedStep;
  const stepMeta = steps[step - 1];
  const completedCount = Object.values(completionByStep).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 10) * 100);

  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const draftSaved = queryValue(params, "draft") === "1";
  const generated = queryValue(params, "generated") === "1";
  const error = queryValue(params, "error");
  const stepLocked = requestedStep > maxAccessibleStep;

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
    <div className="space-y-7">
      <DashboardHeader
        action={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
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
      />

      {banner ? <StatusBanner {...banner} /> : null}

      <Card className="border-slate-200 bg-white/92 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Build workflow", "创建流程")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t(`Step ${step} of 10`, `第 ${step} / 10 步`)} — {stepMeta.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{stepMeta.description}</p>
          </div>
          <Badge className="bg-white text-slate-700">{progressPercent}% {t("complete", "已完成")}</Badge>
        </div>
        <div className="mt-4">
          <ProgressBar value={progressPercent} />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((item) => (
            <div
              className={`rounded-xl border px-3 py-2 text-xs ${
                item.number === step
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : completionByStep[item.number]
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
              key={item.number}
            >
              <span className="font-medium">{t(`Step ${item.number}`, `第 ${item.number} 步`)}</span>
              <p className="mt-1 line-clamp-1">{item.title}</p>
            </div>
          ))}
        </div>
      </Card>

      {stepLocked ? (
        <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" />
            {t("Complete earlier steps first", "请先完成前序步骤")}
          </p>
          <Link
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline"
            href={`/dashboard/flow/build?step=${maxAccessibleStep}`}
          >
            {t("Go to current step", "前往当前步骤")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      ) : null}

      {!stepLocked && step === 1 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            Start with your identity details. You can leave optional fields blank and return later.
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="1" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.basicProfile.fullName ?? snapshot.user.name}
                name="fullName"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email (from account)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
                defaultValue={snapshot.user.email}
                disabled
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Current title</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.currentTitle ?? snapshot.user.headline}
                  name="currentTitle"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Desired title</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.targetTitle ?? snapshot.user.targetRole}
                  name="targetTitle"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.location ?? snapshot.user.location}
                  name="profileLocation"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Work authorization (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.workAuthorization ?? ""}
                  name="workAuthorization"
                  placeholder="e.g. F-1 OPT, H-1B sponsorship required"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Years of experience (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.yearsExperience ?? ""}
                  name="yearsExperience"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Career level (optional)</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.basicProfile.careerLevel ?? ""}
                  name="careerLevel"
                >
                  <option value="">Not specified</option>
                  <option value="student">Student</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="staff_plus">Staff+</option>
                  <option value="manager">Manager</option>
                  <option value="director_plus">Director+</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="2">
                Continue to education
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 2 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            Add education entries. Optional fields help recruiters understand academic strength.
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">Education entry {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.school ?? ""}
                      name={`edu${index}_school`}
                      placeholder="School"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.degree ?? ""}
                      name={`edu${index}_degree`}
                      placeholder="Degree"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.major ?? ""}
                      name={`edu${index}_major`}
                      placeholder="Major"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.graduationDate ?? ""}
                      name={`edu${index}_graduationDate`}
                      placeholder="Graduation date"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.gpa ?? ""}
                      name={`edu${index}_gpa`}
                      placeholder="GPA (optional)"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.honors ?? ""}
                      name={`edu${index}_honors`}
                      placeholder="Honors (optional)"
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.coursework ?? ""}
                    name={`edu${index}_coursework`}
                    placeholder="Relevant coursework (optional)"
                  />
                </div>
              );
            })}

            <p className="text-xs text-slate-500">You can leave entries blank and return later.</p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="3">
                Continue to experience
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 3 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            Add internship or work entries. If you can, mention measurable outcomes.
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">Experience entry {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.company ?? ""}
                      name={`exp${index}_company`}
                      placeholder="Company"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.title ?? ""}
                      name={`exp${index}_title`}
                      placeholder="Role/title"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.location ?? ""}
                      name={`exp${index}_location`}
                      placeholder="Location"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.dates ?? ""}
                      name={`exp${index}_dates`}
                      placeholder="Dates"
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.responsibilities ?? ""}
                    name={`exp${index}_responsibilities`}
                    placeholder="Responsibilities"
                  />
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.achievements ?? ""}
                    name={`exp${index}_achievements`}
                    placeholder="Achievements"
                  />
                  <input
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.quantifiedImpact ?? ""}
                    name={`exp${index}_quantifiedImpact`}
                    placeholder="Quantified impact (optional)"
                    type="text"
                  />
                </div>
              );
            })}

            <p className="text-xs text-slate-500">
              Example: Reduced processing time by 25% by automating weekly report generation.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="4">
                Continue to projects
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 4 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">Show projects that demonstrate practical skills and impact.</p>
          <form action={saveResumeAction} className="space-y-5">
            <input name="currentStep" type="hidden" value="4" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            {[1, 2, 3].map((index) => {
              const item = parsedProjects[index - 1];
              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={index}>
                  <p className="text-sm font-semibold text-slate-900">Project entry {index}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.name ?? ""}
                      name={`project${index}_name`}
                      placeholder="Project name"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.role ?? ""}
                      name={`project${index}_role`}
                      placeholder="Role"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.dates ?? ""}
                      name={`project${index}_dates`}
                      placeholder="Dates (optional)"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={item?.technologies ?? ""}
                      name={`project${index}_technologies`}
                      placeholder="Technologies"
                      type="text"
                    />
                  </div>
                  <textarea
                    className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.description ?? ""}
                    name={`project${index}_description`}
                    placeholder="Project description"
                  />
                  <textarea
                    className="mt-3 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={item?.impact ?? ""}
                    name={`project${index}_impact`}
                    placeholder="Impact / outcome (optional)"
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
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="5">
                Continue to skills
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 5 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">List your tools and capabilities. Keep it practical and role relevant.</p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="5" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Programming languages</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.skills.join(", ") ?? ""}
                name="languagesCsv"
                placeholder="Python, JavaScript, TypeScript"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Frameworks</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                name="frameworksCsv"
                placeholder="React, Next.js, Node.js"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tools / platforms</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                name="toolsPlatformsCsv"
                placeholder="AWS, Docker, GitHub Actions"
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Soft skills (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  name="softSkillsCsv"
                  placeholder="Communication, stakeholder alignment"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Domain knowledge (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  name="domainKnowledgeCsv"
                  placeholder="Fintech, edtech, healthcare"
                  type="text"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="6">
                Continue to enhancements
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 6 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            Optional fields below can improve output quality. Leave blank if you do not have this information yet.
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="6" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Certifications (one per line)</span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.certifications.join("\n") ?? ""}
                  name="certificationLines"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Awards (one per line)</span>
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
                placeholder="LinkedIn URL"
                type="text"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.links.github ?? ""}
                name="githubUrl"
                placeholder="GitHub URL"
                type="text"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.links.portfolio ?? ""}
                name="portfolioUrl"
                placeholder="Portfolio URL"
                type="text"
              />
            </div>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="volunteerExperience"
              placeholder="Volunteer experience (optional)"
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="leadershipExperience"
              placeholder="Leadership experience (optional)"
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="extracurriculars"
              placeholder="Extracurriculars (optional)"
            />
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              name="publicationsLines"
              placeholder="Publications (one per line, optional)"
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Keywords to emphasize (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.keywordEmphasis ?? ""}
                name="keywordEmphasis"
                placeholder="Machine learning, distributed systems"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Industries of interest (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.industryPreference ?? ""}
                name="industryPreference"
                placeholder="Fintech, healthtech, SaaS"
                type="text"
              />
            </label>
            <textarea
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={profile?.notes ?? ""}
              name="resumeNotes"
              placeholder="Any other context you'd like reflected in the resume"
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="7">
                Continue to target role
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 7 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            Add role context. More detail improves matching quality, but only target role is required to continue.
          </p>
          <form action={saveJobDescriptionAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="7" />
            <input name="jobDescriptionId" type="hidden" value={jobDescription?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Target company (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.company ?? ""}
                  name="company"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Target role</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.role ?? ""}
                  name="role"
                  placeholder="e.g. Software Engineer"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Target location (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.location ?? ""}
                  name="location"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Employment type (optional)</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription?.briefData?.employmentType ?? ""}
                  name="employmentType"
                  placeholder="Full-time / Internship"
                  type="text"
                />
              </label>
            </div>
            <textarea
              className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.description ?? ""}
              name="description"
              placeholder="Full job description text (optional but recommended)"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={jobDescription?.briefData?.seniorityLevel ?? ""}
                name="seniorityLevel"
                placeholder="Seniority level (optional)"
                type="text"
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={jobDescription?.briefData?.workMode ?? ""}
                name="workMode"
                placeholder="Work mode (onsite/hybrid/remote)"
                type="text"
              />
            </div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.briefData?.topRequiredSkills.join(", ") ?? ""}
              name="topRequiredSkills"
              placeholder="Key required skills (comma-separated, optional)"
              type="text"
            />
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.briefData?.emphasizeKeywords.join(", ") ?? ""}
              name="emphasizeKeywords"
              placeholder="Keywords to emphasize (optional)"
              type="text"
            />
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.briefData?.responsibilitiesSummary ?? ""}
              name="responsibilitiesSummary"
              placeholder="Hiring priorities / role emphasis (optional)"
            />

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                href="/dashboard/flow/build?step=6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="8">
                Continue to style preferences
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 8 ? (
        <Card className="space-y-5 border-slate-200 bg-white/92 p-6">
          <p className="text-sm text-slate-600">
            {pickText(
              uiLanguage,
              "Set lightweight style preferences for generated output.",
              "设置输出偏好（可选），用于控制生成语言与模板风格。",
            )}
          </p>
          <form action={saveResumeAction} className="space-y-4">
            <input name="currentStep" type="hidden" value="8" />
            <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
            <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
            <input name="intakeMode" type="hidden" value="guided" />
            <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {pickText(uiLanguage, "Resume style", "简历风格")}
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.resumeStyle ?? ""}
                name="resumeStyle"
                placeholder="concise / detailed / technical / achievement-focused"
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {pickText(uiLanguage, "Resume output language", "简历输出语言")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.preferences.outputLanguage ?? "en"}
                  name="outputLanguage"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {pickText(uiLanguage, "Template selection", "模板选择")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={profile?.preferences.templateId ?? "classic_ats"}
                  name="templateId"
                >
                  {RESUME_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {uiLanguage === "zh" ? template.name.zh : template.name.en}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Summary style (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                name="summaryStyle"
                placeholder="direct, narrative, impact-first"
                type="text"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">One-page preference (optional)</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  name="onePagePreference"
                  defaultValue=""
                >
                  <option value="">Not specified</option>
                  <option value="prefer_one_page">Prefer one page</option>
                  <option value="allow_two_pages">Two pages allowed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Tone preference (optional)</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  name="studentProfessionalPolish"
                  defaultValue=""
                >
                  <option value="">Not specified</option>
                  <option value="student_friendly">Student-friendly</option>
                  <option value="professional_polish">Professional polish</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Sections to emphasize (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                name="sectionEmphasis"
                placeholder="Projects, experience, leadership"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Keyword emphasis (optional)</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={profile?.preferences.keywordEmphasis ?? ""}
                name="keywordEmphasis"
                type="text"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Industry/job family preference (optional)</span>
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
                Back
              </Link>
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
              <SubmitButton name="nextStep" pendingLabel="Saving..." value="9">
                {pickText(uiLanguage, "Continue to review", "继续到复核")}
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {!stepLocked && step === 9 ? (
        <Card className="space-y-6 border-slate-200 bg-white/92 p-6">
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Collected sections</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Basic identity: {hasStep1 ? "Complete" : "Missing"}</li>
                <li>Education: {hasStep2 ? "Complete" : "Missing"}</li>
                <li>Experience: {hasStep3 ? "Complete" : "Missing"}</li>
                <li>Projects: {hasStep4 ? "Complete" : "Missing"}</li>
                <li>Skills: {hasStep5 ? "Complete" : "Missing"}</li>
                <li>Target role: {hasStep7 ? "Complete" : "Missing"}</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Missing info that can improve quality</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {!profile?.professionalSummary ? <li>• Add a professional summary.</li> : null}
                {!hasStep3 ? <li>• Add at least one experience entry.</li> : null}
                {!resume?.parsed.experienceBullets.some((bullet) => /\d/.test(bullet)) ? (
                  <li>• Include quantified outcomes when possible.</li>
                ) : null}
                {!jobDescription?.description ? <li>• Add full job description text for better tailoring.</li> : null}
                {!profile?.links.linkedIn ? <li>• Add LinkedIn URL (optional but useful).</li> : null}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
              href="/dashboard/flow/build?step=8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <form action={saveResumeAction}>
              <input name="currentStep" type="hidden" value="9" />
              <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
              <input name="intakeMode" type="hidden" value="guided" />
              <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />
              <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                Save draft
              </SubmitButton>
            </form>
            <form action={generateBuildDraftAction}>
              <input name="currentStep" type="hidden" value="10" />
              <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
              <SubmitButton pendingLabel="Generating draft...">Generate resume now</SubmitButton>
            </form>
          </div>
        </Card>
      ) : null}

      {!stepLocked && step === 10 ? (
        <Card className="space-y-6 border-slate-200 bg-white/92 p-6">
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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

              <form action={saveResumeAction} className="space-y-3">
                <input name="currentStep" type="hidden" value="10" />
                <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
                <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
                <input name="intakeMode" type="hidden" value="guided" />
                <input name="title" type="hidden" value={resume?.title ?? "Build From Scratch Draft"} />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Edit draft text</span>
                  <textarea
                    className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7"
                    defaultValue={resume?.originalText ?? ""}
                    name="quickResumeText"
                  />
                </label>
                <SubmitButton pendingLabel="Saving draft..." variant="outline">
                  {pickText(uiLanguage, "Save edited draft", "保存编辑后的草稿")}
                </SubmitButton>
              </form>

              <form action={generateBuildDraftAction}>
                <input name="currentStep" type="hidden" value="10" />
                <input name="resumeId" type="hidden" value={resume?.id ?? ""} />
                <input name="returnTo" type="hidden" value="/dashboard/flow/build" />
                <SubmitButton pendingLabel="Regenerating..." variant="outline">
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
  );
}
