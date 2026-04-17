import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  Layers3,
  Search,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "ATS scoring built for real job descriptions",
    description:
      "Measure ATS readiness, clarity, impact, and job fit against the roles U.S. employers are actually posting.",
    icon: Search,
  },
  {
    title: "Rewrite weak bullets into stronger evidence",
    description:
      "Turn vague responsibilities into recruiter-friendly bullets with clearer technical detail, outcomes, and ownership.",
    icon: Sparkles,
  },
  {
    title: "Generate tailored versions for each application",
    description:
      "Create role-specific resume cuts, compare them side by side, and export polished drafts when you are ready to apply.",
    icon: Layers3,
  },
];

const audience = [
  "International students translating campus, internship, and project experience into U.S.-style resume language",
  "Early-career applicants who need sharper positioning for software, data, and product-adjacent roles",
  "Tech job seekers applying at volume who need a repeatable workflow for tailoring without starting from scratch",
];

const beforeAfter = [
  {
    label: "Before",
    bullet:
      "Built dashboard for advisors and answered support requests for students.",
    note:
      "Reads generic, undersells scope, and does not communicate measurable impact.",
  },
  {
    label: "After",
    bullet:
      "Built an internal advisor dashboard that improved visibility into student request volume, helping the support team triage issues faster across campus operations.",
    note:
      "Adds product context, operational value, and clearer evidence of ownership.",
  },
];

const proofPoints = [
  "Built for U.S. job seekers competing on ATS screens and recruiter skim time",
  "Useful for internships, new-grad roles, and early-career full-time applications",
  "Structured service layer ready for live AI, billing, and export workflows",
];

export default function HomePage() {
  return (
    <div className="pb-20">
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
        <div>
          <Badge>Built for U.S. resumes, ATS screens, and recruiter skim time</Badge>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-7xl">
            Turn one resume into a sharper application system.
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">
            ResumeForge helps international students, early-career applicants, and tech job seekers
            turn a generic resume into role-specific versions with stronger bullets, cleaner ATS
            signals, and better story fit for U.S. employers.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white"
              href="/signup"
            >
              Start free
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-800"
              href="/pricing"
            >
              View pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              ["Analyze faster", "Paste a resume and JD to surface missing signals in minutes."],
              ["Tailor intentionally", "Rewrite bullets and generate versions without losing your baseline."],
              ["Apply with confidence", "Export recruiter-ready drafts once the story is tight."],
            ].map(([title, detail]) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/60"
              >
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden bg-slate-950 p-0 text-white">
          <div className="border-b border-white/10 px-8 py-6">
            <p className="text-sm text-slate-300">What the product actually does</p>
            <h2 className="mt-2 text-2xl font-semibold">A tighter loop for every application</h2>
          </div>
          <div className="space-y-5 px-8 py-8">
            {[
              "Upload your base resume and parse it into readable sections.",
              "Paste a target job description and extract keywords, seniority signals, and must-haves.",
              "Run ATS analysis, rewrite bullets, generate a tailored draft, and save versions in one workspace.",
            ].map((item, index) => (
              <div key={item} className="flex gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                  0{index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-200">{item}</p>
              </div>
            ))}
            <div className="rounded-3xl bg-white/8 p-5">
              <p className="text-sm font-medium text-white">Free tier for first proof, paid tiers for actual workflow</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Start with limited analysis and rewrites, then upgrade when you need tailored resume generation, comparison, and export-ready output.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <Card className="bg-slate-50">
          <div className="flex items-center gap-3 text-slate-900">
            <FileSearch className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Before and after a better rewrite</h2>
          </div>
          <div className="mt-6 space-y-4">
            {beforeAfter.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-900">{item.bullet}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 text-slate-900">
            <Target className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Why U.S. job seekers use it</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {proofPoints.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
            <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white md:col-span-2">
              <p className="text-sm font-medium">Stronger positioning matters more than more applications.</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                ResumeForge is designed to help you tighten the quality of each submission, especially when your experience needs clearer framing for U.S. hiring expectations.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <Card>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-900" />
            <h2 className="text-xl font-semibold text-slate-950">Who this is for</h2>
          </div>
          <div className="mt-6 space-y-4">
            {audience.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p className="text-sm leading-7 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-950 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Ready to tighten the next application?</h2>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-slate-300">
            Start with one resume and one target role. See the missing keywords, improve the weakest bullets, and move into a tailored draft without rebuilding your resume from scratch.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-900"
              href="/signup"
            >
              Create your workspace
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white"
              href="/pricing"
            >
              Compare plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
