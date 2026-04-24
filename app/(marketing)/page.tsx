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
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";

export default async function HomePage() {
  const uiLanguage = await getUiLanguage();

  const audiences = [
    {
      title: pickText(uiLanguage, "International students in the U.S.", "在美国际学生"),
      description: pickText(
        uiLanguage,
        "Translate projects, campus work, and internships into U.S.-style hiring language.",
        "将项目、校园经历与实习内容转化为符合美国招聘语境的表达。",
      ),
    },
    {
      title: pickText(uiLanguage, "Early-career applicants", "早期职业申请者"),
      description: pickText(
        uiLanguage,
        "Turn generic bullet lists into measurable, role-aligned evidence.",
        "把泛化职责描述改写为可量化且岗位对齐的成果证据。",
      ),
    },
    {
      title: pickText(uiLanguage, "Technical job seekers", "技术岗位求职者"),
      description: pickText(
        uiLanguage,
        "Run a repeatable workflow for tailoring across multiple applications.",
        "用可复用流程批量完成多岗位定向优化。",
      ),
    },
  ];

  const howItWorks = [
    {
      title: pickText(uiLanguage, "Define the target role", "定义目标岗位"),
      description: pickText(
        uiLanguage,
        "Capture role context, company signals, and job description priorities.",
        "先明确岗位上下文、公司信号和 JD 优先项。",
      ),
    },
    {
      title: pickText(uiLanguage, "Build your profile baseline", "建立简历基础档案"),
      description: pickText(
        uiLanguage,
        "Start from an existing resume or use guided intake to fill missing foundations.",
        "可从已有简历开始，也可通过引导式问卷补齐基础信息。",
      ),
    },
    {
      title: pickText(uiLanguage, "Analyze ATS and job fit", "执行 ATS 与岗位匹配分析"),
      description: pickText(
        uiLanguage,
        "Surface missing keywords and highest-leverage improvements.",
        "定位缺失关键词与最高杠杆优化点。",
      ),
    },
    {
      title: pickText(uiLanguage, "Generate and compare versions", "生成并对比版本"),
      description: pickText(
        uiLanguage,
        "Create role-specific drafts, compare outcomes, and export with confidence.",
        "产出岗位定向版本，对比差异后再导出投递。",
      ),
    },
  ];

  const capabilities = [
    {
      icon: Compass,
      title: pickText(uiLanguage, "Build a stronger base resume", "打造更强基础简历"),
      body: pickText(
        uiLanguage,
        "Use quick or guided intake to structure summary, skills, work history, and outcomes.",
        "支持快速模式和引导模式，结构化沉淀摘要、技能、经历与成果。",
      ),
    },
    {
      icon: FileSearch,
      title: pickText(uiLanguage, "Understand ATS and job fit", "看清 ATS 与岗位匹配"),
      body: pickText(
        uiLanguage,
        "Get transparent scores for ATS readiness, clarity, impact, and role alignment.",
        "在同一工作台看到 ATS 适配、表达清晰度、影响力与岗位契合度评分。",
      ),
    },
    {
      icon: Sparkles,
      title: pickText(uiLanguage, "Tailor intentionally", "有策略地定向优化"),
      body: pickText(
        uiLanguage,
        "Rewrite weak bullets by mode and generate targeted versions against specific job descriptions.",
        "按模式重写弱项 Bullet，并针对特定 JD 生成定向版本。",
      ),
    },
    {
      icon: Layers3,
      title: pickText(uiLanguage, "Compare before export", "导出前先对比版本"),
      body: pickText(
        uiLanguage,
        "Review edits side by side and ship the strongest version for each application cycle.",
        "并排查看差异，确保每次投递都使用最强版本。",
      ),
    },
  ];

  const differentiators = [
    pickText(
      uiLanguage,
      "Role-aware workflow: every recommendation stays anchored to a target role brief.",
      "岗位感知流程：每条建议都锚定目标岗位信息。",
    ),
    pickText(
      uiLanguage,
      "Signal-first analysis: focus on what recruiters and ATS systems scan first.",
      "信号优先分析：聚焦招聘者与 ATS 首屏优先信息。",
    ),
    pickText(
      uiLanguage,
      "Iterative refinement loop: baseline, analysis, tailored output, comparison, export.",
      "迭代闭环：基础版本 → 分析 → 定向生成 → 对比 → 导出。",
    ),
  ];

  return (
    <div className="rf-dark-ui relative overflow-hidden pb-24">
      <section className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 pt-20 lg:grid-cols-[1fr_1.02fr] lg:px-8 lg:pt-24">
        <Reveal>
          <Badge className="border-cyan-300/40 bg-cyan-950/35 text-cyan-100">
            {pickText(uiLanguage, "Premium AI resume workflow for U.S. job seekers", "面向美国求职者的高质量 AI 简历工作流")}
          </Badge>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">
            {pickText(
              uiLanguage,
              "Build role-ready resumes with a guided AI workspace.",
              "在引导式 AI 工作区中打造可投递的岗位定向简历。",
            )}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
            {pickText(
              uiLanguage,
              "ResumeForge turns generic resume text into targeted, higher-conviction applications through structured intake, ATS-aware analysis, and versioned tailoring.",
              "ResumeForge 通过结构化采集、ATS 感知分析与版本化定向优化，帮助你从“通用简历”走向“高可信投递”。",
            )}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-cyan-400/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 px-6 text-sm font-medium text-white shadow-[0_16px_38px_-18px_rgba(14,165,233,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
              href="/signup"
            >
              {pickText(uiLanguage, "Start free", "免费开始")}
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/80 px-6 text-sm font-medium text-slate-100 transition-colors duration-300 hover:border-slate-300/70 hover:bg-slate-800/85"
              href="/pricing"
            >
              {pickText(uiLanguage, "View pricing", "查看定价")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="hero-float-a relative overflow-hidden rounded-[32px] border border-slate-600/45 bg-[linear-gradient(165deg,rgba(11,23,41,0.96),rgba(8,14,26,0.85))] p-6 shadow-[0_42px_110px_-70px_rgba(14,165,233,0.58)]">
            <div className="hero-soft-light pointer-events-none absolute -right-8 -top-8 h-56 w-56 rounded-full" />
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
              <span>{pickText(uiLanguage, "Target role brief", "目标岗位简报")}</span>
              <span>{pickText(uiLanguage, "Live profile", "实时档案")}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-600/45 bg-slate-900/75 p-4">
              <p className="text-sm font-medium text-slate-50">
                {pickText(uiLanguage, "Product Data Analyst · Hybrid", "产品数据分析师 · 混合办公")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {pickText(
                  uiLanguage,
                  "Keywords surfaced: SQL, experimentation, stakeholder communication, dashboard ownership.",
                  "识别关键词：SQL、实验设计、跨团队沟通、看板负责制。",
                )}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["ATS", "82"],
                ["Clarity", "76"],
                ["Job Fit", "79"],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-slate-600/45 bg-slate-900/75 p-3" key={label}>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-50">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-400/35 bg-cyan-950/25 p-4 text-cyan-50">
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
                {pickText(uiLanguage, "Tailored rewrite", "定向改写")}
              </p>
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                {pickText(
                  uiLanguage,
                  "Reframed project bullet to quantify workflow impact and highlight cross-functional ownership.",
                  "重写项目 Bullet，量化流程影响，并突出跨团队协作责任。",
                )}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8" id="who-its-for">
        <Reveal>
          <div className="rf-surface rounded-[32px] p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {pickText(uiLanguage, "Who it is for", "适用人群")}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
              {pickText(
                uiLanguage,
                "Built for candidates who need stronger positioning, not just prettier formatting.",
                "面向真正需要“竞争力表达升级”，而不只是“排版美化”的求职者。",
              )}
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {audiences.map((item) => (
                <div className="rounded-2xl border border-slate-600/40 bg-slate-900/75 p-5" key={item.title}>
                  <p className="text-base font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8" id="how-it-works">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {pickText(uiLanguage, "How it works", "使用流程")}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            {pickText(
              uiLanguage,
              "One guided sequence from role definition to export-ready version.",
              "从岗位定义到可导出版本，一条引导路径完成闭环。",
            )}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {howItWorks.map((item, index) => (
            <Reveal delayMs={index * 70} key={item.title}>
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  {pickText(uiLanguage, "Step", "步骤")} 0{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8" id="capabilities">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {pickText(uiLanguage, "Product capabilities", "产品能力")}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            {pickText(
              uiLanguage,
              "Clear modules for every stage of the application workflow.",
              "覆盖投递全流程的关键模块，一步步把质量拉高。",
            )}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal delayMs={index * 80} key={item.title}>
                <Card>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-950/25 text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-semibold text-slate-100">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto mt-24 grid w-full max-w-7xl gap-7 px-6 lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
        <Reveal>
          <Card className="rf-surface-strong p-7">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-cyan-200" />
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {pickText(uiLanguage, "Guided workflow", "引导式工作流")}
              </p>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">
              {pickText(
                uiLanguage,
                "ResumeForge behaves like a workshop, not a blank editor.",
                "ResumeForge 是“引导式工作坊”，不是空白编辑器。",
              )}
            </h3>
            <p className="mt-4 text-sm leading-8 text-slate-300">
              {pickText(
                uiLanguage,
                "You always know the current step, what's complete, what's missing, and what to do next.",
                "你始终清楚当前步骤、已完成项、缺失项以及下一步动作。",
              )}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                pickText(uiLanguage, "Step-by-step intake with draft continuity", "分步采集与草稿连续保存"),
                pickText(uiLanguage, "Data-driven progress and next-step prompts", "数据驱动的进度与下一步提示"),
                pickText(uiLanguage, "Role-aware analysis before tailoring", "定向优化前先做岗位感知分析"),
              ].map((item) => (
                <li className="flex items-start gap-2 text-sm text-slate-200" key={item}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delayMs={110}>
          <Card className="p-7">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <h3 className="text-xl font-semibold text-slate-100">
                {pickText(uiLanguage, "Why it feels different", "为什么它更有效")}
              </h3>
            </div>
            <div className="mt-5 space-y-3">
              {differentiators.map((item) => (
                <div
                  className="rounded-2xl border border-slate-600/40 bg-slate-900/72 p-4 text-sm leading-7 text-slate-200"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </section>

      <section className="relative mx-auto mt-24 w-full max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="rf-surface-strong relative overflow-hidden rounded-[34px] p-8 sm:p-10">
            <div className="hero-soft-light pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full" />
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
                {pickText(uiLanguage, "Start your first cycle", "开始你的第一轮优化")}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                {pickText(
                  uiLanguage,
                  "Build your first tailored version in one guided session.",
                  "在一次引导流程中，完成你的首个定向简历版本。",
                )}
              </h2>
              <p className="mt-4 text-sm leading-8 text-slate-200/90">
                {pickText(
                  uiLanguage,
                  "Define a role, upload your baseline resume, run ATS analysis, and generate a stronger draft before your next application deadline.",
                  "定义目标岗位、导入基础简历、完成 ATS 分析，并在下一次投递前生成更强版本。",
                )}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 px-6 text-sm font-medium text-white"
                  href="/signup"
                >
                  {pickText(uiLanguage, "Start free", "免费开始")}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-500/45 bg-slate-900/70 px-6 text-sm font-medium text-slate-100 transition-colors duration-300 hover:bg-slate-800/85"
                  href="/pricing"
                >
                  {pickText(uiLanguage, "Compare plans", "对比方案")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
