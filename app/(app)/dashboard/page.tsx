import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FileText,
  Lock,
  Layers3,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { AIGuidancePanel } from "@/components/dashboard/ai-guidance-panel";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { ScoreSummary } from "@/components/dashboard/score-summary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAIGuidanceSummary } from "@/lib/ai-guidance";
import { getSessionIdentity } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getPlanDefinition } from "@/lib/billing/plans";
import { getAppSnapshot } from "@/lib/data";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import { getUsageOverview } from "@/lib/usage";
import type { ResumeAnalysis } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const resume = snapshot.resumes[0];
  const jobDescription = snapshot.jobDescriptions[0];
  const latestAnalysisGeneration =
    snapshot.aiGenerations.find(
      (item) =>
        item.type === "ANALYSIS" &&
        item.resumeId === resume?.id &&
        item.jobDescriptionId === jobDescription?.id,
    ) ?? snapshot.aiGenerations.find((item) => item.type === "ANALYSIS");
  const analysis = latestAnalysisGeneration
    ? (latestAnalysisGeneration.output as unknown as ResumeAnalysis)
    : null;
  const currentPlan = snapshot.subscription?.plan ?? "FREE";
  const canCompareVersions = hasFeatureAccess(snapshot.subscription?.plan, "version_compare");
  const workflow = getWorkflowState(snapshot);
  const nextAction = getWorkflowAction(snapshot);
  const guidance = getAIGuidanceSummary(snapshot);
  const usageOverview = getUsageOverview(snapshot);

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Track resume quality, tailor faster, and keep every version organized in one place."
        title="Dashboard"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          helper="Active resumes stored in the workspace."
          icon={<FileText className="h-5 w-5" />}
          label="Resumes"
          value={String(snapshot.resumes.length)}
        />
        <MetricCard
          helper="Saved versions ready for comparison and export."
          icon={<Layers3 className="h-5 w-5" />}
          label="Resume Versions"
          value={String(snapshot.resumeVersions.length)}
        />
        <MetricCard
          helper="Most recent ATS-style score against the active JD."
          icon={<BarChart3 className="h-5 w-5" />}
          label="Latest Score"
          value={analysis ? `${analysis.overall}/100` : "N/A"}
        />
        <MetricCard
          helper="Current subscription plan."
          icon={<CreditCard className="h-5 w-5" />}
          label="Plan"
          value={currentPlan.replace("_", " ")}
        />
      </div>

      <WorkflowStepper workflow={workflow} />

      <AIGuidancePanel guidance={guidance} />

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

      {analysis && jobDescription ? (
        <ScoreSummary
          analysis={analysis}
          compact
          targetLabel={`${jobDescription.company} · ${jobDescription.role}`}
        />
      ) : (
        <EmptyState
          ctaHref="/dashboard/upload"
          ctaLabel="Upload resume and JD"
          description="Add one resume and one job description to unlock score summaries, ATS recommendations, and tailoring insights."
          icon={SearchCheck}
          title="Your dashboard is ready for the first analysis run"
        />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {usageOverview.map((item) => (
          <UsageMeterCard
            key={item.action}
            description={
              item.limit === null
                ? `${item.label} are unlimited on your current plan.`
                : `${item.remaining} ${item.remaining === 1 ? "run" : "runs"} left before an upgrade prompt appears.`
            }
            label={item.label}
            limit={item.limit}
            used={item.used}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Active target role</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {jobDescription?.role ?? "Add a job description"}
              </h2>
            </div>
            {jobDescription ? <Badge>{jobDescription.company}</Badge> : null}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {jobDescription?.description.slice(0, 220) ?? "Upload a job description to start tailoring."}
            {jobDescription && jobDescription.description.length > 220 ? "..." : ""}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(jobDescription?.keywords ?? []).slice(0, 8).map((keyword) => (
              <Badge key={keyword}>{keyword}</Badge>
            ))}
          </div>
          <div className="mt-6">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
              href={resume && jobDescription ? "/dashboard/analysis" : "/dashboard/upload"}
            >
              {resume && jobDescription ? "Open analysis workspace" : "Add your first job description"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Plan status</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {getPlanDefinition(currentPlan).name}
              </h2>
            </div>
            <Badge>{snapshot.subscription?.provider ?? "UNSET"}</Badge>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {getPlanDefinition(currentPlan).description}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Monthly price</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {formatCurrency(snapshot.subscription?.priceMonthly ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Renewal</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {snapshot.subscription?.currentPeriodEnd
                  ? formatDate(snapshot.subscription.currentPeriodEnd)
                  : "Not set"}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {getPlanDefinition(currentPlan).features.slice(0, 3).map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
              >
                {feature}
              </div>
            ))}
          </div>
          <div className="mt-6">
            {currentPlan === "FREE" ? (
              <UpgradePrompt compact feature="tailored_resume" />
            ) : !canCompareVersions ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Your current plan is active, but version comparison is still unavailable.
              </div>
            ) : (
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800"
                href="/dashboard/billing"
              >
                Manage billing
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <p className="text-sm text-slate-500">Analysis snapshot</p>
          {analysis ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {analysis.categories.map((category) => (
                <div key={category.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{category.label}</p>
                    <p className="text-sm font-semibold text-slate-950">{category.score}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{category.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                ctaHref="/dashboard/upload"
                ctaLabel="Set up analysis"
                description="Analysis cards appear here after ResumeForge can compare your resume against a target role."
                icon={BarChart3}
                title="No score snapshot yet"
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Recent activity</p>
              <p className="text-lg font-semibold text-slate-950">Saved versions and billing</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {snapshot.resumeVersions.length > 0 ? (
              snapshot.resumeVersions.slice(0, 2).map((version) => (
                <div
                  key={version.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {version.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{version.summary}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge>{version.type}</Badge>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(version.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                ctaHref="/dashboard/tailoring"
                ctaLabel="Create a tailored version"
                description="Version history starts filling in as soon as you save your first tailored or rewritten resume."
                icon={Sparkles}
                title="No resume versions yet"
              />
            )}
            {snapshot.payments.length > 0 ? (
              snapshot.payments.slice(0, 1).map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{payment.provider}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge>{payment.status}</Badge>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
