import Link from "next/link";
import {
  ArrowRight,
  BookUser,
  BriefcaseBusiness,
  DatabaseZap,
  FileUp,
  FolderSearch,
  Sparkles,
} from "lucide-react";
import { AIGuidancePanel } from "@/components/dashboard/ai-guidance-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAIGuidanceSummary } from "@/lib/ai-guidance";
import { saveJobDescriptionAction, saveResumeAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import { formatDate } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

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
  const nextAction = getWorkflowAction(snapshot);
  const guidance = getAIGuidanceSummary(snapshot);
  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const draftSaved = queryValue(params, "draft") === "1";
  const error = queryValue(params, "error");
  const primaryResume = snapshot.resumes[0];
  const primaryJobDescription = snapshot.jobDescriptions[0];

  const banner = error
    ? {
        title: "Intake needs attention",
        description: error,
        tone: "warning" as const,
      }
    : resumeSaved && draftSaved
      ? {
          title: "Resume draft saved",
          description:
            "Progress is saved. You can continue adding optional details to improve ATS and tailoring quality.",
          tone: "success" as const,
        }
      : resumeSaved
        ? {
            title: "Resume profile updated",
            description:
              "Great. Your base profile is ready for role alignment and ATS analysis.",
            tone: "success" as const,
          }
        : jobDescriptionSaved && draftSaved
          ? {
              title: "Role brief draft saved",
              description:
                "Draft saved successfully. Add required skills and priorities when you are ready.",
              tone: "success" as const,
            }
          : jobDescriptionSaved
            ? {
                title: "Target role brief updated",
                description:
                  "Role context is now richer. You can move straight to ATS analysis.",
                tone: "success" as const,
              }
            : null;

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Build a richer resume profile and target role brief. ResumeForge uses both to produce higher-quality ATS analysis and tailored outputs."
        title="Resume Workshop"
      />

      {banner ? <StatusBanner {...banner} /> : null}

      <WorkflowStepper compact currentStepId="resume" workflow={workflow} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="scroll-mt-28" id="resume-intake">
          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <BookUser className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Step 1 · Resume Profile Builder
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Build your base resume profile
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use Quick Mode if you already have a resume. Use Guided Mode for a stronger, structured profile.
                </p>
              </div>
            </div>

            <form action={saveResumeAction} className="mt-6 space-y-5">
              <input name="resumeId" type="hidden" value={primaryResume?.id ?? ""} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Resume title</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={primaryResume?.title ?? "Software Engineer Resume"}
                    id="resume-title-input"
                    name="title"
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Intake mode</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={primaryResume?.intakeMode ?? "quick"}
                    name="intakeMode"
                  >
                    <option value="quick">Quick Mode (Paste existing resume)</option>
                    <option value="guided">Guided Mode (Build structured profile)</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Quick Mode</p>
                <p className="mt-2 text-sm text-slate-600">
                  Paste your current resume text for the fastest start. Recommended when you already have a baseline version.
                </p>
                <textarea
                  className="mt-4 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={primaryResume?.originalText ?? ""}
                  name="quickResumeText"
                  placeholder="Paste your full resume text here..."
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tip: include your summary and most impact-heavy bullets at the top for better first-pass analysis.
                </p>
              </div>

              <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  Guided Mode · Basic profile
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Structured details improve output quality. Fill what you have now and save as draft anytime.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.basicProfile.fullName ?? ""}
                      name="fullName"
                      type="text"
                    />
                  </label>
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
                    <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.basicProfile.location ?? ""}
                      name="profileLocation"
                      type="text"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Work authorization
                      <span className="ml-2 text-xs font-normal text-slate-500">Optional</span>
                    </span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.basicProfile.workAuthorization ?? ""}
                      name="workAuthorization"
                      placeholder="e.g. F1 OPT, H1B transferable, U.S. Citizen"
                      type="text"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Years of experience
                      <span className="ml-2 text-xs font-normal text-slate-500">Optional</span>
                    </span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.basicProfile.yearsExperience ?? ""}
                      name="yearsExperience"
                      type="text"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Career level</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.basicProfile.careerLevel ?? ""}
                      name="careerLevel"
                    >
                      <option value="">Not specified yet</option>
                      <option value="student">Student</option>
                      <option value="entry">Entry level</option>
                      <option value="mid">Mid level</option>
                      <option value="senior">Senior</option>
                      <option value="staff_plus">Staff / Principal</option>
                      <option value="manager">Manager</option>
                      <option value="director_plus">Director+</option>
                    </select>
                  </label>
                </div>
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  Professional summary, skills, and impact signals
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Recommended if you want stronger ATS matching and better rewrite quality.
                </p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Professional summary</span>
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                    defaultValue={primaryResume?.profileData?.professionalSummary ?? ""}
                    name="professionalSummary"
                    placeholder="Describe your scope, strongest capabilities, and the type of role you are targeting."
                  />
                </label>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Skills (comma-separated)</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryResume?.profileData?.skills.join(", ") ?? ""}
                    name="skillsCsv"
                    placeholder="React, TypeScript, SQL, Data Modeling, Experimentation"
                    type="text"
                  />
                </label>
                <p className="mt-3 text-xs text-slate-500">
                  Tip: include tools and skills that frequently appear in U.S. job descriptions you target.
                </p>
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  Work experience entries (optional but highly recommended)
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Instead of only responsibilities, add measurable outcomes.
                  Example: Reduced processing time by 25%.
                </p>
                {[1, 2].map((index) => (
                  <div key={index} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Experience entry {index}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.company ?? ""}
                        name={`exp${index}_company`}
                        placeholder="Company"
                        type="text"
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.title ?? ""}
                        name={`exp${index}_title`}
                        placeholder="Title"
                        type="text"
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.location ?? ""}
                        name={`exp${index}_location`}
                        placeholder="Location"
                        type="text"
                      />
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.dates ?? ""}
                        name={`exp${index}_dates`}
                        placeholder="Dates (e.g. 2023 - Present)"
                        type="text"
                      />
                    </div>
                    <textarea
                      className="mt-3 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.responsibilities ?? ""}
                      name={`exp${index}_responsibilities`}
                      placeholder="Core responsibilities"
                    />
                    <textarea
                      className="mt-3 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.achievements ?? ""}
                      name={`exp${index}_achievements`}
                      placeholder="Achievements"
                    />
                    <input
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.workExperiences[index - 1]?.quantifiedImpact ?? ""}
                      name={`exp${index}_quantifiedImpact`}
                      placeholder="Quantified impact (optional)"
                      type="text"
                    />
                  </div>
                ))}
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  Advanced profile detail (optional, improves output quality)
                </summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Education (one per line)</span>
                    <textarea
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.education.join("\n") ?? ""}
                      name="educationLines"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Projects (one per line)</span>
                    <textarea
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.projects.join("\n") ?? ""}
                      name="projectLines"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Certifications (one per line)</span>
                    <textarea
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.certifications.join("\n") ?? ""}
                      name="certificationLines"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Awards (one per line)</span>
                    <textarea
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={primaryResume?.profileData?.awards.join("\n") ?? ""}
                      name="awardLines"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryResume?.profileData?.preferences.resumeStyle ?? ""}
                    name="resumeStyle"
                    placeholder="Resume preference (concise, technical, leadership-heavy...)"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryResume?.profileData?.preferences.keywordEmphasis ?? ""}
                    name="keywordEmphasis"
                    placeholder="Keyword emphasis preferences"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryResume?.profileData?.preferences.industryPreference ?? ""}
                    name="industryPreference"
                    placeholder="Industry / job type preference"
                    type="text"
                  />
                </div>
                <textarea
                  className="mt-4 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={primaryResume?.profileData?.notes ?? ""}
                  name="resumeNotes"
                  placeholder="Any additional context for AI guidance (optional)"
                />
              </details>

              <div className="flex flex-wrap gap-3">
                <SubmitButton name="intent" pendingLabel="Saving draft..." value="draft" variant="outline">
                  Save profile draft
                </SubmitButton>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white shadow-sm shadow-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-70"
                  formAction={saveResumeAction}
                  name="intent"
                  type="submit"
                  value="save"
                >
                  Save and continue
                </button>
              </div>
            </form>
          </Card>
        </section>

        <section className="scroll-mt-28" id="job-description-intake">
          <Card className="bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Step 2 · Target Role Brief
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Build your role-specific brief
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The richer your role brief, the better ResumeForge can tailor keywords, tone, and impact framing.
                </p>
              </div>
            </div>

            <form action={saveJobDescriptionAction} className="mt-6 space-y-5">
              <input name="jobDescriptionId" type="hidden" value={primaryJobDescription?.id ?? ""} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Company</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.company ?? ""}
                    id="job-company-input"
                    name="company"
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.role ?? ""}
                    id="job-role-input"
                    name="role"
                    type="text"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  defaultValue={primaryJobDescription?.location ?? ""}
                  name="location"
                  type="text"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Job description text</span>
                <textarea
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={primaryJobDescription?.description ?? ""}
                  id="job-description-input"
                  name="description"
                  placeholder="Paste full job description..."
                />
              </label>

              <details className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  Optional role intelligence (improves tailoring precision)
                </summary>
                <p className="mt-2 text-sm text-slate-600">
                  Add if you have it. This helps ResumeForge prioritize the right signals.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                    placeholder="Work mode (onsite/hybrid/remote)"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.industryDomain ?? ""}
                    name="industryDomain"
                    placeholder="Industry / domain"
                    type="text"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:col-span-2"
                    defaultValue={primaryJobDescription?.briefData?.salaryRange ?? ""}
                    name="salaryRange"
                    placeholder="Salary range (if known)"
                    type="text"
                  />
                </div>
                <div className="mt-4 grid gap-4">
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
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Responsibilities summary</span>
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={primaryJobDescription?.briefData?.responsibilitiesSummary ?? ""}
                    name="responsibilitiesSummary"
                    placeholder="Summarize core day-to-day responsibilities and expectations."
                  />
                </label>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Hiring priorities</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                    {[
                      ["technical_depth", "Technical depth"],
                      ["communication", "Communication"],
                      ["leadership", "Leadership"],
                      ["execution", "Execution"],
                      ["research", "Research"],
                      ["product_thinking", "Product thinking"],
                    ].map(([value, label]) => (
                      <label key={value} className="inline-flex items-center gap-2">
                        <input
                          defaultChecked={primaryJobDescription?.briefData?.hiringPriorities.includes(
                            value as
                              | "technical_depth"
                              | "communication"
                              | "leadership"
                              | "execution"
                              | "research"
                              | "product_thinking",
                          )}
                          name="hiringPriorities"
                          type="checkbox"
                          value={value}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">ATS intensity</span>
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
                    <span className="mb-2 block text-sm font-medium text-slate-700">Technical intensity</span>
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
                <textarea
                  className="mt-4 min-h-[90px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={primaryJobDescription?.briefData?.recruiterNotes ?? ""}
                  name="recruiterNotes"
                  placeholder="Recruiter / hiring manager emphasis notes (optional)"
                />
              </details>

              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
                  name="intent"
                  type="submit"
                  value="draft"
                >
                  Save role draft
                </button>
                <SubmitButton pendingLabel="Saving target role...">
                  <span>Save role brief</span>
                </SubmitButton>
              </div>
            </form>
          </Card>
        </section>
      </div>

      <AIGuidancePanel compact guidance={guidance} />

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next best action</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {nextAction.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{nextAction.description}</p>
          </div>
          <Badge className="bg-white text-slate-700">{workflow.percent}% complete</Badge>
        </div>
        <div className="mt-6">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href={nextAction.href}
          >
            {nextAction.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Saved resume profiles</h3>
          <div className="mt-5 space-y-3">
            {snapshot.resumes.length > 0 ? (
              snapshot.resumes.map((resume) => (
                <div key={resume.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700">
                      <FileUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{resume.title}</p>
                        <Badge className="bg-white text-slate-700">
                          {resume.intakeMode === "guided" ? "Guided" : "Quick"}
                        </Badge>
                        <Badge className="bg-slate-900 text-white">
                          {resume.profileCompleteness}% complete
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {resume.parsed.sections.length} parsed sections • updated {formatDate(resume.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                ctaHref="#resume-intake"
                ctaLabel="Build first profile"
                description="Start with quick paste or guided mode. Save draft anytime and continue later."
                icon={FolderSearch}
                title="No resume profiles saved yet"
              />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Saved target role briefs</h3>
          <div className="mt-5 space-y-3">
            {snapshot.jobDescriptions.length > 0 ? (
              snapshot.jobDescriptions.map((jobDescription) => (
                <div
                  key={jobDescription.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700">
                      <DatabaseZap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {jobDescription.company} · {jobDescription.role}
                        </p>
                        <Badge className="bg-slate-900 text-white">
                          {jobDescription.briefCompleteness}% complete
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Keywords: {jobDescription.keywords.slice(0, 6).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                ctaHref="#job-description-intake"
                ctaLabel="Create first role brief"
                description="Capture the role context you actually target. This directly improves tailoring quality."
                icon={Sparkles}
                title="No target role briefs saved yet"
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
