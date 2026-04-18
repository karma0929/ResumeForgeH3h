import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileSearch,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const audiences = [
  {
    title: "International students in the U.S.",
    description: "Translate projects, campus work, and internships into U.S.-style hiring language.",
  },
  {
    title: "Early-career applicants",
    description: "Turn generic bullet lists into measurable, role-aligned evidence.",
  },
  {
    title: "Technical job seekers",
    description: "Run a repeatable workflow for tailoring across multiple applications.",
  },
];

const howItWorks = [
  {
    title: "Define the target role",
    description: "Capture role context, company signals, and job description priorities first.",
  },
  {
    title: "Build your profile baseline",
    description: "Start from an existing resume or use guided intake to fill missing foundations.",
  },
  {
    title: "Analyze ATS and job fit",
    description: "Surface missing keywords, weak signals, and the highest-leverage improvement areas.",
  },
  {
    title: "Generate and compare versions",
    description: "Create role-specific drafts, compare outcomes, and export with confidence.",
  },
];

const capabilities = [
  {
    icon: Compass,
    title: "Build a stronger base resume",
    body: "Use quick or guided intake to structure summary, skills, work history, and results without overwhelm.",
  },
  {
    icon: FileSearch,
    title: "Understand ATS and job fit",
    body: "Get clear scoring across ATS readiness, clarity, impact, and role alignment from one workspace.",
  },
  {
    icon: Sparkles,
    title: "Tailor intentionally, not randomly",
    body: "Rewrite weak bullets by mode and generate targeted versions against a specific job description.",
  },
  {
    icon: Layers3,
    title: "Compare versions before exporting",
    body: "Review edits side by side and ship the strongest version for each application cycle.",
  },
];

const differentiators = [
  "Role-aware workflow: every recommendation is anchored to a target role brief.",
  "Signal-first analysis: focus on what recruiters and ATS systems scan first.",
  "Iterative refinement loop: baseline, analysis, tailored output, comparison, export.",
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden pb-24">
      <div className="ambient-glow ambient-glow-a pointer-events-none" />
      <div className="ambient-glow ambient-glow-b pointer-events-none" />
      <div className="ambient-grid pointer-events-none" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 pt-20 lg:grid-cols-[1fr_0.98fr] lg:px-8 lg:pt-24">
        <div className="section-rise" style={{ animationDelay: "0ms" }}>
          <Badge className="bg-white text-slate-700">
            Premium AI resume workflow for U.S. job seekers
          </Badge>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Build role-ready resumes with a guided system, not guesswork.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">
            ResumeForge helps you move from generic resume text to targeted, higher-conviction
            applications through structured intake, ATS-aware analysis, and versioned tailoring.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
              href="/signup"
            >
              Start free
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-800 transition-colors duration-300 hover:bg-slate-50"
              href="/pricing"
            >
              View pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["ATS-aware", "Role-specific", "Versioned workflow"].map((item) => (
              <div
                className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-700"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[530px] section-rise" style={{ animationDelay: "120ms" }}>
          <div className="hero-float-a absolute left-0 right-8 top-6 rounded-[34px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_50px_90px_-50px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-500">
              <span>Target role brief</span>
              <span>Live profile</span>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">Product Data Analyst · Hybrid</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keywords surfaced: SQL, experimentation, stakeholder communication, dashboard ownership.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["ATS", "82"],
                ["Clarity", "76"],
                ["Job Fit", "79"],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-slate-200 bg-white p-3" key={label}>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tailored rewrite</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Reframed project bullet to quantify workflow impact and highlight cross-functional ownership.
              </p>
            </div>
          </div>

          <div className="hero-float-b absolute bottom-10 right-0 w-[78%] rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.5)]">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Version comparison</p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-900">
                Before: generic responsibilities
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                After: quantified, role-aligned outcomes
              </div>
            </div>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900"
              href="/signup"
            >
              Build your first tailored version
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-20 w-full max-w-7xl px-6 lg:px-8" id="who-its-for">
        <div className="section-rise rounded-[34px] border border-slate-200 bg-white/88 p-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Who it is for</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Built for candidates who need stronger positioning, not just prettier formatting.
            </h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {audiences.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5" key={item.title}>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8" id="how-it-works">
        <div className="section-rise">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            One guided sequence from role definition to export-ready version.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {howItWorks.map((item, index) => (
            <Card className="section-rise bg-white/88" key={item.title}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 0{index + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8" id="capabilities">
        <div className="section-rise">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Product capabilities</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Clear modules for every stage of the application workflow.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <Card className="section-rise bg-gradient-to-b from-white to-slate-50" key={item.title}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-24 grid w-full max-w-7xl gap-7 px-6 lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
        <Card className="section-rise bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-sky-300" />
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Guided workflow</p>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">
            ResumeForge behaves like a workshop, not a blank editor.
          </h3>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            You always know your current step, what is complete, what is missing, and what to do next.
            Optional fields stay available behind progressive disclosure so advanced users get depth without adding noise.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Step-by-step intake with draft continuity",
              "Data-driven progress and next-step prompts",
              "Role-aware analysis before tailoring",
            ].map((item) => (
              <li className="flex items-start gap-2 text-sm text-slate-200" key={item}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="section-rise bg-white/92">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-slate-700" />
            <h3 className="text-xl font-semibold text-slate-950">Why it feels different</h3>
          </div>
          <div className="mt-5 space-y-3">
            {differentiators.map((item) => (
              <div
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8">
        <div className="section-rise overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-[0_40px_90px_-50px_rgba(2,6,23,0.8)] sm:p-10">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Start your first cycle</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build your first tailored version in one guided session.
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-300">
              Define a role, upload your baseline resume, run ATS analysis, and generate a stronger draft
              before your next application deadline.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-900 transition-transform duration-300 hover:-translate-y-0.5"
                href="/signup"
              >
                Start free
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white transition-colors duration-300 hover:bg-white/10"
                href="/pricing"
              >
                Compare plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="hero-soft-light pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full" />
        </div>
      </section>
    </div>
  );
}
