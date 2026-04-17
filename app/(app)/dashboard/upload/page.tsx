import { DatabaseZap, FileUp, FolderSearch } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OnboardingFlow } from "@/components/dashboard/onboarding-flow";
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
  const status =
    queryValue(params, "resumeSaved") ||
    queryValue(params, "jobDescriptionSaved") ||
    queryValue(params, "error");
  const banner =
    status && status !== "1"
      ? {
          title: "Upload input needs attention",
          description: status,
          tone: "warning" as const,
        }
      : status
          ? {
              title: "Saved successfully",
              description: "Your workspace has been updated and is ready for analysis.",
              tone: "success" as const,
            }
          : null;

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Paste resume content, add target job descriptions, and keep both stored for later scoring and tailoring."
        title="Upload Resume"
      />

      {banner ? <StatusBanner {...banner} /> : null}

      {!onboarding.isComplete ? (
        <OnboardingFlow
          completed={onboarding.completed}
          compact
          percent={onboarding.percent}
          steps={onboarding.steps}
          total={onboarding.total}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
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
                name="originalText"
                required
              />
            </label>
            <SubmitButton pendingLabel="Saving resume...">Save resume</SubmitButton>
          </form>
        </Card>

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
                name="description"
                required
              />
            </label>
            <SubmitButton pendingLabel="Saving job description...">Save job description</SubmitButton>
          </form>
        </Card>
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
                description="Save the roles you are targeting so analysis can measure fit and tailoring can use the right keywords."
                icon={DatabaseZap}
                title="No job descriptions stored yet"
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
