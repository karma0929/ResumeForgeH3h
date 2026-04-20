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
        "把泛化的职责描述改写为可量化、与岗位匹配的成果证据。",
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
        "Capture role context, company signals, and job description priorities first.",
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
        "Surface missing keywords, weak signals, and the highest-leverage improvement areas.",
        "定位缺失关键词、薄弱信号和最高杠杆优化点。",
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
        "Use quick or guided intake to structure summary, skills, work history, and results without overwhelm.",
        "支持快速模式和引导模式，结构化沉淀摘要、技能、经历与成果，不再被大表单压垮。",
      ),
    },
    {
      icon: FileSearch,
      title: pickText(uiLanguage, "Understand ATS and job fit", "看清 ATS 与岗位匹配"),
      body: pickText(
        uiLanguage,
        "Get clear scoring across ATS readiness, clarity, impact, and role alignment from one workspace.",
        "在同一工作台看到 ATS 适配、表达清晰度、影响力与岗位契合度评分。",
      ),
    },
    {
      icon: Sparkles,
      title: pickText(uiLanguage, "Tailor intentionally, not randomly", "有策略地定向优化"),
      body: pickText(
        uiLanguage,
        "Rewrite weak bullets by mode and generate targeted versions against a specific job description.",
        "按模式重写弱项 Bullet，并针对特定 JD 生成定向版本。",
      ),
    },
    {
      icon: Layers3,
      title: pickText(uiLanguage, "Compare versions before exporting", "导出前先对比版本"),
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
      "Role-aware workflow: every recommendation is anchored to a target role brief.",
      "岗位感知流程：每条建议都锚定目标岗位信息。",
    ),
    pickText(
      uiLanguage,
      "Signal-first analysis: focus on what recruiters and ATS systems scan first.",
      "信号优先分析：聚焦招聘者与 ATS 首屏会看的内容。",
    ),
    pickText(
      uiLanguage,
      "Iterative refinement loop: baseline, analysis, tailored output, comparison, export.",
      "迭代闭环：基础版本 → 分析 → 定向生成 → 对比 → 导出。",
    ),
  ];

  return (
    <div className="relative overflow-hidden pb-24">
      <div className="ambient-glow ambient-glow-a pointer-events-none" />
      <div className="ambient-glow ambient-glow-b pointer-events-none" />
      <div className="ambient-grid pointer-events-none" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 pt-20 lg:grid-cols-[1fr_0.98fr] lg:px-8 lg:pt-24">
        <div className="section-rise" style={{ animationDelay: "0ms" }}>
          <Badge className="bg-white text-slate-700">
            {pickText(uiLanguage, "Premium AI resume workflow for U.S. job seekers", "面向美国求职者的高质量 AI 简历工作流")}
          </Badge>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            {pickText(
              uiLanguage,
              "Build role-ready resumes with a guided system, not guesswork.",
              "用引导式系统构建可投递简历，而不是靠猜。",
            )}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">
            {pickText(
              uiLanguage,
              "ResumeForge helps you move from generic resume text to targeted, higher-conviction applications through structured intake, ATS-aware analysis, and versioned tailoring.",
              "ResumeForge 通过结构化采集、ATS 感知分析与版本化定向优化，帮助你从“通用简历”走向“高可信投递”。",
            )}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
              href="/signup"
            >
              {pickText(uiLanguage, "Start free", "免费开始")}
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-800 transition-colors duration-300 hover:bg-slate-50"
              href="/pricing"
            >
              {pickText(uiLanguage, "View pricing", "查看定价")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[pickText(uiLanguage, "ATS-aware", "ATS 感知"), pickText(uiLanguage, "Role-specific", "岗位定向"), pickText(uiLanguage, "Versioned workflow", "版本化流程")].map((item) => (
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
              <span>{pickText(uiLanguage, "Target role brief", "目标岗位简报")}</span>
              <span>{pickText(uiLanguage, "Live profile", "实时档案")}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">
                {pickText(uiLanguage, "Product Data Analyst · Hybrid", "产品数据分析师 · 混合办公")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
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
                <div className="rounded-2xl border border-slate-200 bg-white p-3" key={label}>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {pickText(uiLanguage, "Tailored rewrite", "定向改写")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {pickText(
                  uiLanguage,
                  "Reframed project bullet to quantify workflow impact and highlight cross-functional ownership.",
                  "重写项目 Bullet，量化流程影响，并突出跨团队协作责任。",
                )}
              </p>
            </div>
          </div>

          <div className="hero-float-b absolute bottom-10 right-0 w-[78%] rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.5)]">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              {pickText(uiLanguage, "Version comparison", "版本对比")}
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-900">
                {pickText(uiLanguage, "Before: generic responsibilities", "优化前：职责表达泛化")}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                {pickText(uiLanguage, "After: quantified, role-aligned outcomes", "优化后：可量化且岗位对齐的成果")}
              </div>
            </div>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900"
              href="/signup"
            >
              {pickText(uiLanguage, "Build your first tailored version", "开始生成你的首个定向版本")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-20 w-full max-w-7xl px-6 lg:px-8" id="who-its-for">
        <div className="section-rise rounded-[34px] border border-slate-200 bg-white/88 p-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {pickText(uiLanguage, "Who it is for", "适用人群")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {pickText(
                uiLanguage,
                "Built for candidates who need stronger positioning, not just prettier formatting.",
                "面向真正需要“竞争力表达升级”，而不只是“排版美化”的求职者。",
              )}
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {pickText(uiLanguage, "How it works", "使用流程")}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {pickText(
              uiLanguage,
              "One guided sequence from role definition to export-ready version.",
              "从岗位定义到可导出版本，一条引导路径完成闭环。",
            )}
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {pickText(uiLanguage, "Product capabilities", "产品能力")}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {pickText(
              uiLanguage,
              "Clear modules for every stage of the application workflow.",
              "覆盖投递全流程的关键模块，一步步把质量拉高。",
            )}
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {pickText(uiLanguage, "Guided workflow", "引导式工作流")}
            </p>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">
            {pickText(
              uiLanguage,
              "ResumeForge behaves like a workshop, not a blank editor.",
              "ResumeForge 是“引导式工作坊”，不是空白编辑器。",
            )}
          </h3>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            {pickText(
              uiLanguage,
              "You always know your current step, what is complete, what is missing, and what to do next. Optional fields stay available behind progressive disclosure so advanced users get depth without adding noise.",
              "你始终清楚当前步骤、已完成项、缺失项以及下一步动作。可选字段通过渐进式展开呈现，既保证进阶深度，也避免信息噪音。",
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

        <Card className="section-rise bg-white/92">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-slate-700" />
            <h3 className="text-xl font-semibold text-slate-950">
              {pickText(uiLanguage, "Why it feels different", "为什么它更有效")}
            </h3>
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
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
              {pickText(uiLanguage, "Start your first cycle", "开始你的第一轮优化")}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {pickText(
                uiLanguage,
                "Build your first tailored version in one guided session.",
                "在一次引导流程中，完成你的首个定向简历版本。",
              )}
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-300">
              {pickText(
                uiLanguage,
                "Define a role, upload your baseline resume, run ATS analysis, and generate a stronger draft before your next application deadline.",
                "定义目标岗位、导入基础简历、完成 ATS 分析，并在下一次投递前生成更强版本。",
              )}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-slate-900 transition-transform duration-300 hover:-translate-y-0.5"
                href="/signup"
              >
                {pickText(uiLanguage, "Start free", "免费开始")}
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white transition-colors duration-300 hover:bg-white/10"
                href="/pricing"
              >
                {pickText(uiLanguage, "Compare plans", "对比方案")}
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
