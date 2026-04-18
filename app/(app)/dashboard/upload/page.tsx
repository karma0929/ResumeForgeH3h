import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAnalysisAction, saveJobDescriptionAction, saveResumeAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getWorkflowState } from "@/lib/onboarding";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseStep(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1 || parsed > 7) {
    return fallback;
  }

  return parsed;
}

const wizardSteps = [
  {
    number: 1,
    id: "target-role",
    title: "Define target role",
    why: "Tailoring quality depends on role context and hiring priorities.",
  },
  {
    number: 2,
    id: "resume-baseline",
    title: "Add current resume baseline",
    why: "ResumeForge needs your current baseline before it can improve wording and fit.",
  },
  {
    number: 3,
    id: "core-profile",
    title: "Build core profile",
    why: "Summary, skills, experience, and education drive scoring and draft generation.",
  },
  {
    number: 4,
    id: "enhancements",
    title: "Add optional enhancements",
    why: "Optional details increase ATS matching and recruiter confidence.",
  },
  {
    number: 5,
    id: "draft",
    title: "Review baseline readiness",
    why: "Catch missing information before analysis to avoid weak recommendations.",
  },
  {
    number: 6,
    id: "analysis",
    title: "Run analysis against target role",
    why: "Use ATS/job-fit gaps to guide what to rewrite first.",
  },
  {
    number: 7,
    id: "tailored",
    title: "Generate tailored version",
    why: "Turn insights into a role-specific submission draft.",
  },
];

const intensityOptions = ["low", "medium", "high"] as const;

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const workflow = getWorkflowState(snapshot);
  const primaryResume = snapshot.resumes[0];
  const primaryJobDescription = snapshot.jobDescriptions[0];
  const hasTargetRole = Boolean(
    primaryJobDescription &&
      (primaryJobDescription.briefCompleteness >= 35 || primaryJobDescription.description.length >= 80),
  );
  const hasResumeBaseline = Boolean(primaryResume && primaryResume.originalText.length >= 40);
  const hasCoreProfile = Boolean(primaryResume && primaryResume.profileCompleteness >= 45);
  const hasEnhancements = Boolean(primaryResume && primaryResume.profileCompleteness >= 70);
  const hasDraftReady = hasTargetRole && hasResumeBaseline;
  const hasAnalysis = snapshot.aiGenerations.some(
    (generation) =>
      generation.type === "ANALYSIS" &&
      (!primaryResume || generation.resumeId === primaryResume.id) &&
      (!primaryJobDescription || generation.jobDescriptionId === primaryJobDescription.id),
  );
  const hasTailored = snapshot.resumeVersions.some(
    (version) =>
      version.type === "TAILORED" &&
      (!primaryResume || version.resumeId === primaryResume.id) &&
      (!primaryJobDescription || version.jobDescriptionId === primaryJobDescription.id),
  );

  const completionByStep: Record<number, boolean> = {
    1: hasTargetRole,
    2: hasResumeBaseline,
    3: hasCoreProfile,
    4: hasEnhancements,
    5: hasDraftReady,
    6: hasAnalysis,
    7: hasTailored,
  };

  const firstIncomplete =
    wizardSteps.find((step) => !completionByStep[step.number])?.number ?? wizardSteps.length;
  const maxAccessibleStep = firstIncomplete;
  const requestedStep = parseStep(queryValue(params, "step"), maxAccessibleStep);
  const step = requestedStep > maxAccessibleStep ? maxAccessibleStep : requestedStep;
  const stepMeta = wizardSteps[step - 1];

  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const draftSaved = queryValue(params, "draft") === "1";
  const error = queryValue(params, "error");
  const stepLocked = requestedStep > maxAccessibleStep;

  const banner = error
    ? {
        title: "This step needs attention",
        description: error,
        tone: "warning" as const,
      }
    : resumeSaved && draftSaved
      ? {
          title: "Draft saved",
          description: "Progress is saved. Continue when ready.",
          tone: "success" as const,
        }
      : resumeSaved
        ? {
            title: "Resume profile saved",
            description: "Great. Continue to the next step.",
            tone: "success" as const,
          }
        : jobDescriptionSaved && draftSaved
          ? {
              title: "Role brief draft saved",
              description: "Role context is saved and can be refined later.",
              tone: "success" as const,
            }
          : jobDescriptionSaved
            ? {
                title: "Target role saved",
                description: "Now add your resume baseline to continue.",
                tone: "success" as const,
              }
            : null;

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Complete one step at a time. ResumeForge will guide you from role targeting to ATS analysis and tailored draft generation."
        title="Guided Resume Workshop"
      />

      {banner ? <StatusBanner {...banner} /> : null}

      <WorkflowStepper compact currentStepId={stepMeta.id} workflow={workflow} />

      <div className="grid gap-6 xl:grid-cols-[0.36fr_0.64fr]">
        <Card className="h-fit">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wizard progress</p>
          <div className="mt-4 space-y-2">
            {wizardSteps.map((item) => {
              const complete = completionByStep[item.number];
              const isCurrent = item.number === step;
              const accessible = item.number <= maxAccessibleStep;
              return (
                <Link
                  aria-disabled={!accessible}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition-colors ${
                    isCurrent
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : complete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : accessible
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-50/70 text-slate-400"
                  }`}
                  href={accessible ? `/dashboard/upload?step=${item.number}` : `/dashboard/upload?step=${maxAccessibleStep}`}
                  key={item.number}
                >
                  <span className="flex items-center gap-2">
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : <span>{item.number}.</span>}
                    {item.title}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Why this step matters</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{stepMeta.why}</p>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="bg-white text-slate-700">Step {step} of 7</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{stepMeta.title}</h2>
            </div>
            <Badge className="bg-slate-900 text-white">{workflow.percent}% complete</Badge>
          </div>

          {stepLocked ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Complete earlier steps first
              </p>
              <p className="mt-2 text-sm">
                This step is locked until you complete the current required step.
              </p>
              <Link
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline"
                href={`/dashboard/upload?step=${maxAccessibleStep}`}
              >
                Go to current step
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {!stepLocked && step === 1 ? (
            <form action={saveJobDescriptionAction} className="space-y-4">
              <input name="currentStep" type="hidden" value="1" />
              <input name="jobDescriptionId" type="hidden" value={primaryJobDescription?.id ?? ""} />
              <input name="returnTo" type="hidden" value="/dashboard/upload" />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Company</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={primaryJobDescription?.company ?? ""}
                  name="company"
                  type="text"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.role ?? ""}
                    name="role"
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.location ?? ""}
                    name="location"
                    type="text"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Job description text</span>
                <textarea
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={primaryJobDescription?.description ?? ""}
                  name="description"
                  placeholder="Paste the full role description..."
                />
              </label>

              <details className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Improve results (optional)
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Optional, but improves tailoring quality and ATS precision.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.seniorityLevel ?? ""}
                    name="seniorityLevel"
                    placeholder="Seniority level"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.employmentType ?? ""}
                    name="employmentType"
                    placeholder="Employment type"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.workMode ?? ""}
                    name="workMode"
                    placeholder="Work mode"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.industryDomain ?? ""}
                    name="industryDomain"
                    placeholder="Industry/domain"
                    type="text"
                  />
                </div>
                <div className="mt-3 grid gap-3">
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.topRequiredSkills.join(", ") ?? ""}
                    name="topRequiredSkills"
                    placeholder="Top required skills (comma-separated)"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.preferredSkills.join(", ") ?? ""}
                    name="preferredSkills"
                    placeholder="Preferred skills (comma-separated)"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.emphasizeKeywords.join(", ") ?? ""}
                    name="emphasizeKeywords"
                    placeholder="Keywords to emphasize (comma-separated)"
                    type="text"
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      ATS intensity
                    </span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryJobDescription?.briefData?.atsIntensity ?? ""}
                      name="atsIntensity"
                    >
                      <option value="">Not specified</option>
                      {intensityOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Technical intensity
                    </span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryJobDescription?.briefData?.technicalIntensity ?? ""}
                      name="technicalIntensity"
                    >
                      <option value="">Not specified</option>
                      {intensityOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>

              <div className="flex flex-wrap gap-3">
                <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                  Save draft
                </SubmitButton>
                <SubmitButton name="nextStep" pendingLabel="Saving role..." value="2">
                  Save and continue
                </SubmitButton>
              </div>
            </form>
          ) : null}

          {!stepLocked && step === 2 ? (
            <>
              {!hasTargetRole ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="text-sm font-semibold">Define target role first</p>
                  <p className="mt-1 text-sm">Complete Step 1 before adding your resume baseline.</p>
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/upload?step=1">
                    Go to Step 1
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form action={saveResumeAction} className="space-y-4">
                  <input name="currentStep" type="hidden" value="2" />
                  <input name="resumeId" type="hidden" value={primaryResume?.id ?? ""} />
                  <input name="returnTo" type="hidden" value="/dashboard/upload" />

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Resume title</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.title ?? "Software Engineer Resume"}
                      name="title"
                      type="text"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Mode</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.intakeMode ?? "quick"}
                      name="intakeMode"
                    >
                      <option value="quick">Quick mode (I already have a resume)</option>
                      <option value="guided">Guided mode (Help me build/refine one)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Current resume text</span>
                    <textarea
                      className="min-h-[260px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                      defaultValue={primaryResume?.originalText ?? ""}
                      name="quickResumeText"
                      placeholder="Paste your existing resume text..."
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Example improvement pattern: instead of only listing tasks, include measurable outcomes.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href="/dashboard/upload?step=1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Link>
                    <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                      Save draft
                    </SubmitButton>
                    <SubmitButton name="nextStep" pendingLabel="Saving baseline..." value="3">
                      Save and continue
                    </SubmitButton>
                  </div>
                </form>
              )}
            </>
          ) : null}

          {!stepLocked && step === 3 ? (
            <>
              {!hasResumeBaseline ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="text-sm font-semibold">Add resume baseline first</p>
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/upload?step=2">
                    Go to Step 2
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form action={saveResumeAction} className="space-y-4">
                  <input name="currentStep" type="hidden" value="3" />
                  <input name="resumeId" type="hidden" value={primaryResume?.id ?? ""} />
                  <input name="returnTo" type="hidden" value="/dashboard/upload" />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Current title</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.basicProfile.currentTitle ?? ""}
                        name="currentTitle"
                        type="text"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Target title</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.basicProfile.targetTitle ?? ""}
                        name="targetTitle"
                        type="text"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Years of experience</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.basicProfile.yearsExperience ?? ""}
                        name="yearsExperience"
                        type="text"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.basicProfile.location ?? ""}
                        name="profileLocation"
                        type="text"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Professional summary</span>
                    <textarea
                      className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7"
                      defaultValue={primaryResume?.profileData?.professionalSummary ?? ""}
                      name="professionalSummary"
                      placeholder="Briefly describe your profile and strongest value for this target role."
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Skills (comma-separated)</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.skills.join(", ") ?? ""}
                      name="skillsCsv"
                      type="text"
                    />
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Experience entry</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[0]?.company ?? ""}
                        name="exp1_company"
                        placeholder="Company"
                        type="text"
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[0]?.title ?? ""}
                        name="exp1_title"
                        placeholder="Title"
                        type="text"
                      />
                    </div>
                    <textarea
                      className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.workExperiences[0]?.responsibilities ?? ""}
                      name="exp1_responsibilities"
                      placeholder="Responsibilities"
                    />
                    <textarea
                      className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.workExperiences[0]?.achievements ?? ""}
                      name="exp1_achievements"
                      placeholder="Achievements"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Education (one per line)</span>
                      <textarea
                        className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.education.join("\n") ?? ""}
                        name="educationLines"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Projects (one per line)</span>
                      <textarea
                        className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.projects.join("\n") ?? ""}
                        name="projectLines"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href="/dashboard/upload?step=2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Link>
                    <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                      Save draft
                    </SubmitButton>
                    <SubmitButton name="nextStep" pendingLabel="Saving core profile..." value="4">
                      Save and continue
                    </SubmitButton>
                  </div>
                </form>
              )}
            </>
          ) : null}

          {!stepLocked && step === 4 ? (
            <>
              {!hasCoreProfile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="text-sm font-semibold">Complete core profile first</p>
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/upload?step=3">
                    Go to Step 3
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form action={saveResumeAction} className="space-y-4">
                  <input name="currentStep" type="hidden" value="4" />
                  <input name="resumeId" type="hidden" value={primaryResume?.id ?? ""} />
                  <input name="returnTo" type="hidden" value="/dashboard/upload" />

                  <p className="text-sm text-slate-600">
                    Optional fields below are not required, but they usually improve ATS relevance and rewrite quality.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Quantified impact (example)</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[0]?.quantifiedImpact ?? ""}
                        name="exp1_quantifiedImpact"
                        placeholder="Reduced processing time by 25%"
                        type="text"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Certifications (one per line)</span>
                      <textarea
                        className="min-h-[98px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.certifications.join("\n") ?? ""}
                        name="certificationLines"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Awards (one per line)</span>
                      <textarea
                        className="min-h-[98px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.awards.join("\n") ?? ""}
                        name="awardLines"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Resume style preference</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.preferences.resumeStyle ?? ""}
                        name="resumeStyle"
                        placeholder="concise / technical / achievement-heavy / leadership-heavy"
                        type="text"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.links.linkedIn ?? ""}
                      name="linkedInUrl"
                      placeholder="LinkedIn URL"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.links.github ?? ""}
                      name="githubUrl"
                      placeholder="GitHub URL"
                      type="text"
                    />
                    <input
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.links.portfolio ?? ""}
                      name="portfolioUrl"
                      placeholder="Portfolio URL"
                      type="text"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href="/dashboard/upload?step=3"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Link>
                    <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                      Save draft
                    </SubmitButton>
                    <SubmitButton name="nextStep" pendingLabel="Saving enhancements..." value="5">
                      Save and continue
                    </SubmitButton>
                  </div>
                </form>
              )}
            </>
          ) : null}

          {!stepLocked && step === 5 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Baseline readiness summary</p>
                <p className="mt-2 text-sm text-slate-600">
                  Resume profile completeness: <strong>{primaryResume?.profileCompleteness ?? 0}%</strong>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Target role brief completeness: <strong>{primaryJobDescription?.briefCompleteness ?? 0}%</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Missing information that may improve results</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {primaryResume?.profileData?.professionalSummary ? null : <li>• Add a professional summary.</li>}
                  {primaryResume?.profileData?.skills.length ? null : <li>• Add a concrete skills list.</li>}
                  {primaryResume?.parsed.experienceBullets.some((bullet) => /\d/.test(bullet)) ? null : (
                    <li>• Add quantified outcomes (example: reduced processing time by 25%).</li>
                  )}
                  {primaryJobDescription?.briefData?.topRequiredSkills.length ? null : (
                    <li>• Add top required skills in target role brief.</li>
                  )}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                  href="/dashboard/upload?step=4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
                  href="/dashboard/upload?step=6"
                >
                  Continue to analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          {!stepLocked && step === 6 ? (
            <div className="space-y-5">
              {!hasDraftReady ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="text-sm font-semibold">Complete earlier intake steps first</p>
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/upload?step=1">
                    Go to Step 1
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    You are ready to run ATS analysis for this role. This will generate fit gaps and keyword opportunities.
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {primaryJobDescription?.company} · {primaryJobDescription?.role}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{primaryResume?.title ?? "Active resume"}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href="/dashboard/upload?step=5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Link>
                    <form action={runAnalysisAction}>
                      <input name="resumeId" type="hidden" value={primaryResume?.id ?? ""} />
                      <input name="jobDescriptionId" type="hidden" value={primaryJobDescription?.id ?? ""} />
                      <SubmitButton pendingLabel="Running ATS analysis...">Run ATS analysis now</SubmitButton>
                    </form>
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href={`/dashboard/analysis?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`}
                    >
                      Open analysis workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {!stepLocked && step === 7 ? (
            <div className="space-y-5">
              {!hasAnalysis ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="text-sm font-semibold">Run analysis before tailoring</p>
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline" href="/dashboard/upload?step=6">
                    Go to Step 6
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    Analysis is available. Generate a tailored version and then compare/export in Resume Versions.
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {hasTailored ? "Tailored version already exists." : "No tailored version saved yet."}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Use tailoring workspace to generate and save a role-specific draft.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      href="/dashboard/upload?step=6"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Link>
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
                      href={`/dashboard/tailoring?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`}
                    >
                      Open tailoring workspace
                      <Sparkles className="h-4 w-4" />
                    </Link>
                    {hasTailored ? (
                      <Link
                        className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                        href="/dashboard/versions"
                      >
                        Compare and export
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-slate-700" />
              Draft & continuity
            </p>
            <p className="mt-2">
              Every step supports draft saving. ResumeForge preserves prior entries and you can continue later without re-entering all fields.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
