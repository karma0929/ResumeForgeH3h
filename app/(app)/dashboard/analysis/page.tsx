import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  ScanSearch,
  WandSparkles,
} from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ScoreSummary } from "@/components/dashboard/score-summary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAnalysisAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getUsageRemaining } from "@/lib/usage";
import type { ResumeAnalysis } from "@/lib/types";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const resumeId = queryValue(params, "resumeId") ?? snapshot.resumes[0]?.id;
  const jobDescriptionId =
    queryValue(params, "jobDescriptionId") ?? snapshot.jobDescriptions[0]?.id;
  const error = queryValue(params, "error");
  const ran = queryValue(params, "ran");
  const saved = queryValue(params, "saved");
  const resume = snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0];
  const jobDescription =
    snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ??
    snapshot.jobDescriptions[0];
  const savedAnalysisGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? null;
  const analysis =
    savedAnalysisGeneration
      ? (savedAnalysisGeneration.output as unknown as ResumeAnalysis)
      : null;
  const topMissingKeywords = analysis?.missingKeywords.slice(0, 5) ?? [];
  const topMatchedKeywords = analysis?.matchedKeywords.slice(0, 5) ?? [];
  const analysisRemaining = getUsageRemaining(snapshot.subscription?.plan, snapshot.usage, "analysis");
  const canRunAnalysis = analysisRemaining === null || analysisRemaining > 0;
  const quickWins = analysis
    ? [
        analysis.missingKeywords.length > 0
          ? `Work ${analysis.missingKeywords[0]} into your summary, skills, or strongest project bullet.`
          : "Keyword coverage is in good shape. Focus on making impact clearer.",
        analysis.impact < 75
          ? "Increase quantified outcomes so recruiters can quickly see results."
          : "Your impact signal is solid. Tighten wording to make it even easier to skim.",
        analysis.clarity < 75
          ? "Shorten dense bullets and keep each line scoped to one outcome."
          : "Clarity is working. Preserve this structure in every tailored version.",
      ]
    : [];

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Score the active resume against a target job description and save the analysis snapshot for later review."
        title="Resume Analysis"
      />

      {saved ? (
        <StatusBanner
          description="The latest analysis snapshot is now recorded and ready to reference while tailoring bullets or versions."
          title="Analysis snapshot saved"
          tone="success"
        />
      ) : null}

      {error ? (
        <StatusBanner
          description={error}
          title="Analysis unavailable"
          tone="warning"
        />
      ) : null}

      {ran ? (
        <StatusBanner
          description="ResumeForge scored your active resume against the selected role and updated your latest analysis state."
          title="Analysis complete"
          tone="success"
        />
      ) : null}

      <Card>
        <form action={runAnalysisAction} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Resume</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={resume?.id}
              name="resumeId"
            >
              {snapshot.resumes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Job description</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              defaultValue={jobDescription?.id}
              name="jobDescriptionId"
            >
              {snapshot.jobDescriptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.company} · {item.role}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            {canRunAnalysis ? (
              <SubmitButton pendingLabel="Running analysis...">
                {analysis ? "Run analysis again" : "Run analysis"}
              </SubmitButton>
            ) : (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
                href="/dashboard/billing?usageLimit=analysis&blocked=1"
              >
                Upgrade to continue
              </Link>
            )}
          </div>
        </form>
      </Card>

      <UsageMeterCard
        description={
          analysisRemaining === null
            ? "Your current plan includes unlimited resume-to-JD analysis runs."
            : `${analysisRemaining} analysis ${analysisRemaining === 1 ? "run" : "runs"} left on the free plan.`
        }
        label="Analysis usage"
        limit={analysisRemaining === null ? null : snapshot.usage.analysesUsed + analysisRemaining}
        used={snapshot.usage.analysesUsed}
      />

      {analysis && resume && jobDescription ? (
        <>
          <ScoreSummary
            analysis={analysis}
            targetLabel={`${jobDescription.company} · ${jobDescription.role}`}
          />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="bg-gradient-to-br from-white to-slate-50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Hiring readout</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    ResumeForge recruiter summary
                  </h2>
                </div>
                <Badge className="bg-slate-900 text-white">
                  {analysis.overall >= 80
                    ? "Likely shortlist"
                    : analysis.overall >= 70
                      ? "Needs polish"
                      : "At risk"}
                </Badge>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Matched</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.matchedKeywords.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">keywords aligned to the JD</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Missing</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.missingKeywords.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">keywords still underrepresented</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suggestions</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {analysis.suggestions.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">recommended edits to prioritize</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-900">
                  What a recruiter would notice first
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {analysis.overall >= 80
                    ? "The resume already maps well to the role. The strongest lever now is making impact and role-specific keywords even more obvious in the first scan."
                    : analysis.overall >= 70
                      ? "The foundation is credible, but the resume is not yet telling the tightest story for this specific role. Close the keyword and impact gaps first."
                      : "There is enough relevant experience here, but the resume is underselling fit. The current wording is likely leaving recruiter confidence on the table."}
                </p>
              </div>
              {!canRunAnalysis ? <div className="mt-6"><UsageLimitPrompt compact action="analysis" /></div> : null}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priority actions</p>
                  <p className="text-lg font-semibold text-slate-950">What to fix next</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {quickWins.map((item, index) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Recommended next step</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
                  Move directly into tailoring once you save this snapshot so rewrites stay anchored to the same target JD.
                </div>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800"
                  href={`/dashboard/tailoring?resumeId=${resume.id}&jobDescriptionId=${jobDescription.id}`}
                >
                  Open tailoring workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Keyword alignment</p>
                  <p className="text-lg font-semibold text-slate-950">
                    Matched vs missing signals
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <p className="text-sm font-medium text-emerald-800">Matched keywords</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topMatchedKeywords.length > 0 ? (
                      topMatchedKeywords.map((keyword) => (
                        <Badge key={keyword} className="bg-white text-emerald-700">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-emerald-800/80">
                        No strong keyword matches yet.
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-5">
                  <p className="text-sm font-medium text-amber-900">Missing keywords</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topMissingKeywords.length > 0 ? (
                      topMissingKeywords.map((keyword) => (
                        <Badge key={keyword} className="bg-white text-amber-700">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-amber-900/80">
                        No major keyword gaps detected.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-900">Score breakdown</p>
                <div className="mt-4 space-y-5">
                  {analysis.categories.map((category) => (
                    <div key={category.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{category.label}</span>
                        <span className="text-slate-500">{category.score}</span>
                      </div>
                      <ProgressBar value={category.score} />
                      <p className="mt-2 text-sm text-slate-600">{category.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Strengths</p>
                    <p className="text-lg font-semibold text-slate-950">What is already working</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {analysis.strengths.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                    <WandSparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Suggested edits</p>
                    <p className="text-lg font-semibold text-slate-950">
                      Best levers to improve fit
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {analysis.suggestions.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          ctaHref={resume && jobDescription ? undefined : "/dashboard/upload"}
          ctaLabel={resume && jobDescription ? undefined : "Add resume and job description"}
          description={
            resume && jobDescription
              ? "Select a resume and job description, then run your first analysis to see ATS alignment, clarity, impact, and job fit."
              : "Analysis becomes available once ResumeForge has both sides of the comparison: your resume and the role you are targeting."
          }
          icon={ScanSearch}
          title="Run your first ATS analysis"
          secondary={
            resume && jobDescription ? (
              canRunAnalysis ? (
                <form action={runAnalysisAction}>
                  <input name="resumeId" type="hidden" value={resume.id} />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                  <SubmitButton pendingLabel="Running analysis...">Run analysis</SubmitButton>
                </form>
              ) : (
                <UsageLimitPrompt compact action="analysis" />
              )
            ) : null
          }
        />
      )}
    </div>
  );
}
