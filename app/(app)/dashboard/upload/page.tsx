import Link from "next/link";
import { ArrowRight, DatabaseZap, FileUp, FolderSearch } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UploadOnboardingFlow } from "@/components/dashboard/upload-onboarding-flow";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSessionIdentity } from "@/lib/auth";
import { saveJobDescriptionAction, saveResumeAction } from "@/lib/actions/dashboard";
import { getAppSnapshot } from "@/lib/data";
import { getOnboardingProgress } from "@/lib/onboarding";
import { formatDate } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const onboarding = getOnboardingProgress(snapshot);
  const resumeSaved = queryValue(params, "resumeSaved") === "1";
  const jobDescriptionSaved = queryValue(params, "jobDescriptionSaved") === "1";
  const error = queryValue(params, "error");
  const primaryResume = snapshot.resumes[0];
  const primaryJobDescription = snapshot.jobDescriptions[0];
  const hasAnalysis = snapshot.usage.analysesUsed > 0;
  const hasTailoredVersion = snapshot.resumeVersions.some((version) => version.type === "TAILORED");

  const banner = error
    ? {
        title: "Upload input needs attention",
        description: error,
        tone: "warning" as const,
      }
    : resumeSaved
      ? {
          title: "Resume saved",
          description:
            snapshot.jobDescriptions.length > 0
              ? "Your base resume is ready. Next, run ATS analysis against a target job description."
              : "Great start. Next, paste one target job description so ResumeForge can score fit.",
          tone: "success" as const,
        }
      : jobDescriptionSaved
        ? {
            title: "Job description saved",
            description:
              snapshot.resumes.length > 0
                ? "Target role is stored. You can now run ATS analysis or open tailoring."
                : "Now add your base resume so ResumeForge can compare and tailor effectively.",
            tone: "success" as const,
          }
        : null;

  const nextAction =
    snapshot.resumes.length === 0
      ? {
          title: "Next: add your base resume",
          href: "#resume-intake",
          label: "Go to resume form",
        }
      : snapshot.jobDescriptions.length === 0
        ? {
            title: "Next: add one target job description",
            href: "#job-description-intake",
            label: "Go to job description form",
          }
        : {
            title: "Next: run ATS analysis",
            href: `/dashboard/analysis?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`,
            label: "Open analysis workspace",
          };

  const workflowAction =
    snapshot.resumes.length === 0 || snapshot.jobDescriptions.length === 0
      ? {
          title: "Complete source setup first",
          description:
            "Save one resume and one target job description. This unlocks analysis, bullet rewrites, and tailored resume generation.",
          href: "/dashboard/upload",
          label: "Finish setup",
        }
      : !hasAnalysis
        ? {
            title: "Run your first ATS analysis",
            description:
              "Generate your first score summary to identify missing keywords and prioritize rewrite opportunities.",
            href: `/dashboard/analysis?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`,
            label: "Go to analysis",
          }
        : !hasTailoredVersion
          ? {
              title: "Generate your first tailored version",
              description:
                "Move into tailoring to rewrite bullets and create a role-specific draft version you can compare and export.",
              href: `/dashboard/tailoring?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`,
              label: "Go to tailoring",
            }
          : {
              title: "Review and export your versions",
              description:
                "You already have analysis and tailored output. Compare versions side-by-side and export the one you want to submit.",
              href: "/dashboard/versions",
              label: "Go to versions",
            };

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Paste resume content, add target job descriptions, and keep both stored for later scoring and tailoring."
        title="Upload Resume"
      />

      {banner ? <StatusBanner {...banner} /> : null}

      {!onboarding.isComplete ? (
        <UploadOnboardingFlow
          completed={onboarding.completed}
          hasJobDescription={snapshot.jobDescriptions.length > 0}
          hasResume={snapshot.resumes.length > 0}
          jobDescriptionId={primaryJobDescription?.id}
          percent={onboarding.percent}
          resumeId={primaryResume?.id}
          steps={onboarding.steps}
          total={onboarding.total}
        />
      ) : null}

      {banner ? (
        <Card className="border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">{nextAction.title}</p>
          <p className="mt-2 text-sm text-slate-600">
            Keep moving through the workflow to unlock stronger analysis and better tailored outputs.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
              href={nextAction.href}
            >
              {nextAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {snapshot.resumes.length > 0 && snapshot.jobDescriptions.length > 0 ? (
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
                href={`/dashboard/tailoring?resumeId=${primaryResume?.id ?? ""}&jobDescriptionId=${primaryJobDescription?.id ?? ""}`}
              >
                Open tailoring
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="scroll-mt-28" id="resume-intake">
          <Card>
            <h2 className="text-xl font-semibold text-slate-950">Resume intake</h2>
            <p className="mt-2 text-sm text-slate-600">
              Paste resume text now. PDF and DOCX parsing are intentionally left as a next integration step.
            </p>
            <form action={saveResumeAction} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Resume title</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue="Software Engineer Resume"
                  id="resume-title-input"
                  name="title"
                  required
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Resume text</span>
                <textarea
                  className="min-h-[320px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={snapshot.resumes[0]?.originalText}
                  id="resume-text-input"
                  name="originalText"
                  required
                />
              </label>
              <SubmitButton pendingLabel="Saving resume...">Save resume</SubmitButton>
            </form>
          </Card>
        </section>

        <section className="scroll-mt-28" id="job-description-intake">
          <Card>
            <h2 className="text-xl font-semibold text-slate-950">Job description intake</h2>
            <p className="mt-2 text-sm text-slate-600">
              Store the role you are targeting so ResumeForge can analyze fit and tailor versions.
            </p>
            <form action={saveJobDescriptionAction} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Company</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={snapshot.jobDescriptions[0]?.company}
                    id="job-company-input"
                    name="company"
                    required
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    defaultValue={snapshot.jobDescriptions[0]?.role}
                    id="job-role-input"
                    name="role"
                    required
                    type="text"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={snapshot.jobDescriptions[0]?.location}
                  name="location"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                <textarea
                  className="min-h-[250px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={snapshot.jobDescriptions[0]?.description}
                  id="job-description-input"
                  name="description"
                  required
                />
              </label>
              <SubmitButton pendingLabel="Saving job description...">Save job description</SubmitButton>
            </form>
          </Card>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Stored resumes</h3>
          <div className="mt-5 space-y-3">
            {snapshot.resumes.length > 0 ? (
              snapshot.resumes.map((resume) => (
                <div key={resume.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700">
                      <FileUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{resume.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {resume.parsed.sections.length} parsed sections • updated{" "}
                        {formatDate(resume.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                ctaHref="#resume-intake"
                ctaLabel="Add first resume"
                description="Paste your base resume here first. ResumeForge will parse it into sections and use it as the foundation for analysis and tailoring."
                icon={FolderSearch}
                title="No resumes stored yet"
              />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Stored job descriptions</h3>
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
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {jobDescription.company} · {jobDescription.role}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {jobDescription.keywords.slice(0, 5).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                ctaHref="#job-description-intake"
                ctaLabel="Add first job description"
                description="Save the roles you are targeting so analysis can measure fit and tailoring can use the right keywords."
                icon={DatabaseZap}
                title="No job descriptions stored yet"
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <p className="text-sm text-slate-500">Workflow progress</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {workflowAction.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {workflowAction.description}
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href={workflowAction.href}
          >
            {workflowAction.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
