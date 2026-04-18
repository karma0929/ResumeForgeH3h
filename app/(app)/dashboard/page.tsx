import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Compass,
  FileUp,
  Wand2,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getJourneyState } from "@/lib/journey";
import { getWorkflowAction } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

function PathLauncherCard({
  title,
  description,
  points,
  href,
  cta,
  icon: Icon,
  highlighted = false,
  started = false,
  progress,
}: {
  title: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
  icon: ComponentType<{ className?: string }>;
  highlighted?: boolean;
  started?: boolean;
  progress?: { completed: number; total: number; percent: number };
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-slate-200 bg-white/92 p-7 transition-all duration-300",
        highlighted
          ? "border-sky-200 bg-gradient-to-b from-sky-50/70 to-white shadow-[0_30px_80px_-55px_rgba(2,132,199,0.45)]"
          : "hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
          <Icon className="h-5 w-5" />
        </div>
        {started && progress ? (
          <Badge className="bg-white text-slate-700">
            {progress.completed}/{progress.total} complete
          </Badge>
        ) : (
          <Badge className="bg-white text-slate-600">New path</Badge>
        )}
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

      <div className="mt-5 space-y-2">
        {points.map((point) => (
          <p className="text-sm text-slate-700" key={point}>
            • {point}
          </p>
        ))}
      </div>

      {started && progress ? (
        <div className="mt-5">
          <ProgressBar value={progress.percent} />
        </div>
      ) : null}

      <Link
        className={cn(
          "mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
          highlighted
            ? "bg-slate-950 text-white hover:bg-slate-800"
            : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        )}
        href={href}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

export default async function DashboardPage() {
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const journey = getJourneyState(snapshot);
  const nextAction = getWorkflowAction(snapshot);
  const hasActiveJourney = journey.signals.hasAnyProgress;

  return (
    <div className="space-y-7">
      <DashboardHeader
        description="ResumeForge is a guided workshop. Choose your starting path, then move step by step from intake to tailored output."
        title="Start Your Next Resume Mission"
      />

      <Card className="border-slate-200 bg-white/92 p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Guided entry</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          How do you want to start?
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Pick the workflow that matches where you are today. You can always switch paths later
          without losing saved progress.
        </p>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          <PathLauncherCard
            cta={journey.improve.started ? "Continue improving" : "Start with my current resume"}
            description="Best when you already have a baseline resume and want role-specific improvements quickly."
            highlighted={journey.recommendedPath === "improve"}
            href="/dashboard/flow/improve"
            icon={FileUp}
            points={[
              "Bring in your existing resume baseline",
              "Add target role context and run ATS fit analysis",
              "Generate tailored versions and export",
            ]}
            progress={journey.improve}
            started={journey.improve.started}
            title="Improve an existing resume"
          />
          <PathLauncherCard
            cta={journey.build.started ? "Continue building" : "Build my resume step by step"}
            description="Best when you need a stronger foundation and want a guided profile-building sequence."
            highlighted={journey.recommendedPath === "build"}
            href="/dashboard/flow/build"
            icon={Compass}
            points={[
              "Define target role and build core profile",
              "Add optional enhancements for stronger ATS matching",
              "Generate, analyze, tailor, and export",
            ]}
            progress={journey.build}
            started={journey.build.started}
            title="Build from scratch"
          />
        </div>
      </Card>

      {hasActiveJourney ? (
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Continue where you left off</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{nextAction.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{nextAction.description}</p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
              href={nextAction.href}
            >
              {nextAction.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : null}

      <details className="rounded-3xl border border-slate-200 bg-white/80 p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
          Workspace tools
        </summary>
        <p className="mt-2 text-sm text-slate-600">
          Secondary areas are still available here and in the sidebar.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/dashboard/analysis"
          >
            Analysis
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/dashboard/versions"
          >
            Versions
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/dashboard/billing"
          >
            Billing
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/dashboard/settings"
          >
            Settings
          </Link>
        </div>
      </details>

      <Card className="border-slate-200 bg-slate-900 p-6 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Guided workshop principle</p>
            <p className="mt-2 text-base leading-7 text-slate-200">
              Start with one decision, then reveal complexity only when it helps your next step.
            </p>
          </div>
          <Wand2 className="h-5 w-5 text-sky-300" />
        </div>
      </Card>
    </div>
  );
}
