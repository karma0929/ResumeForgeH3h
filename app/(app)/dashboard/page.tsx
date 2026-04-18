import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Layers3,
  Sparkles,
} from "lucide-react";
import { AIGuidancePanel } from "@/components/dashboard/ai-guidance-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAIGuidanceSummary } from "@/lib/ai-guidance";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const workflow = getWorkflowState(snapshot);
  const nextAction = getWorkflowAction(snapshot);
  const guidance = getAIGuidanceSummary(snapshot);
  const activeResume = snapshot.resumes[0];
  const activeRole = snapshot.jobDescriptions[0];
  const latestTailored = snapshot.resumeVersions.find((version) => version.type === "TAILORED");
  const latestAnalysis = snapshot.aiGenerations.find((item) => item.type === "ANALYSIS");

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Treat ResumeForge as your guided workshop. Follow the next step, complete the flow, and ship a stronger application package."
        title="Workflow Hub"
      />

      <WorkflowStepper workflow={workflow} />

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current mission</p>
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

      <AIGuidancePanel guidance={guidance} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active resume profile</p>
              <p className="text-lg font-semibold text-slate-950">
                {activeResume?.title ?? "Not created yet"}
              </p>
            </div>
          </div>
          {activeResume ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Profile completeness: <strong>{activeResume.profileCompleteness}%</strong>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Last updated {formatDate(activeResume.updatedAt)}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                ctaHref="/dashboard/upload?step=2"
                ctaLabel="Add baseline resume"
                description="Start by adding your current resume baseline."
                icon={FileText}
                title="No resume yet"
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Target role</p>
              <p className="text-lg font-semibold text-slate-950">
                {activeRole ? `${activeRole.company} · ${activeRole.role}` : "Not defined yet"}
              </p>
            </div>
          </div>
          {activeRole ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Brief completeness: <strong>{activeRole.briefCompleteness}%</strong>
              </p>
              <p className="mt-1 text-sm text-slate-600">Keywords: {activeRole.keywords.slice(0, 5).join(", ")}</p>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                ctaHref="/dashboard/upload?step=1"
                ctaLabel="Define target role"
                description="Set the role first so ResumeForge can tailor intelligently."
                icon={BriefcaseBusiness}
                title="No target role yet"
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Latest outputs</p>
              <p className="text-lg font-semibold text-slate-950">Analysis + tailored draft</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Analysis</p>
              <p className="mt-1 text-sm text-slate-600">
                {latestAnalysis ? "Available" : "Not generated yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Tailored version</p>
              <p className="mt-1 text-sm text-slate-600">
                {latestTailored ? latestTailored.name : "Not generated yet"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Quick actions</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard/upload?step=1"
          >
            Define target role
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard/upload?step=3"
          >
            Refine profile
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard/analysis"
          >
            Open analysis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
            href="/dashboard/tailoring"
          >
            Generate tailored
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
