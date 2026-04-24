import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Compass,
  FileUp,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { getJourneyState } from "@/lib/journey";
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
  uiLanguage,
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
  uiLanguage: "en" | "zh";
}) {
  const t = (en: string, zh: string) => (uiLanguage === "zh" ? zh : en);
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[26px] border border-slate-600/45 bg-slate-900/70 p-7 transition-all duration-300 backdrop-blur-sm",
        highlighted
          ? "border-cyan-300/65 bg-gradient-to-b from-sky-500/16 to-slate-900 shadow-[0_30px_80px_-55px_rgba(2,132,199,0.55)]"
          : "hover:-translate-y-0.5 hover:border-slate-400/60 hover:bg-slate-800/82",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-500/45 bg-slate-900/85 text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
        {started && progress ? (
          <Badge className="bg-white text-slate-700">
            {progress.completed}/{progress.total} {t("complete", "已完成")}
          </Badge>
        ) : (
          <Badge className="bg-white text-slate-600">{t("New path", "新路径")}</Badge>
        )}
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>

      <div className="mt-5 space-y-2">
        {points.map((point) => (
          <p className="text-sm text-slate-200" key={point}>
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
            ? "border border-cyan-400/45 bg-gradient-to-r from-sky-500/88 to-blue-600/88 text-white hover:from-sky-500 hover:to-blue-500"
            : "border border-slate-500/45 bg-slate-900/78 text-slate-100 hover:border-slate-300/70 hover:bg-slate-800/85",
        )}
        href={href}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export default async function DashboardPage() {
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const journey = getJourneyState(snapshot);
  const uiLanguage = await getUiLanguage();

  return (
    <div className="space-y-7">
      <Reveal>
        <DashboardHeader
          description={pickText(
            uiLanguage,
            "Choose one path and proceed step by step. ResumeForge will guide the journey from intake to a usable draft.",
            "选择一条路径并按步骤完成。ResumeForge 会从信息采集引导到可用草稿。",
          )}
          title={pickText(uiLanguage, "How do you want to start?", "你想如何开始？")}
          workspaceLabel={pickText(uiLanguage, "ResumeForge Workspace", "ResumeForge 工作区")}
        />
      </Reveal>

      <Reveal delayMs={80}>
        <section className="rf-surface-strong rounded-[30px] p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {pickText(uiLanguage, "Path selection", "路径选择")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            {pickText(
              uiLanguage,
              "Start with your current resume or build one from scratch.",
              "从现有简历优化，或从零开始创建。",
            )}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {pickText(
              uiLanguage,
              "For this release, the full guided experience is focused on the Build from scratch path. You can still open Improve existing resume as an upcoming path.",
              "当前版本优先完善“从零创建”全流程。“优化现有简历”路径已保留为后续上线入口。",
            )}
          </p>

          <div className="mt-7 grid gap-5 xl:grid-cols-2">
            <PathLauncherCard
              cta={pickText(uiLanguage, "Open improve path", "进入优化路径")}
              description={pickText(
                uiLanguage,
                "Use this if you already have a baseline resume and want role-targeted improvements.",
                "如果你已有基础简历并希望做岗位定向优化，请选择此路径。",
              )}
              highlighted={false}
              href="/dashboard/flow/improve"
              icon={FileUp}
              points={[
                pickText(uiLanguage, "Upload baseline resume", "导入基础简历"),
                pickText(uiLanguage, "Run fit analysis", "执行匹配分析"),
                pickText(uiLanguage, "Tailor and export", "定向优化并导出"),
              ]}
              progress={journey.improve}
              started={false}
              title={pickText(uiLanguage, "Improve an existing resume", "优化现有简历")}
              uiLanguage={uiLanguage}
            />
            <PathLauncherCard
              cta={journey.build.started ? pickText(uiLanguage, "Continue building", "继续创建") : pickText(uiLanguage, "Build my resume step by step", "分步创建我的简历")}
              description={pickText(
                uiLanguage,
                "Best when you need a structured, guided questionnaire to build a strong resume draft.",
                "适合需要通过结构化问卷逐步搭建高质量简历的人。",
              )}
              highlighted={journey.recommendedPath === "build"}
              href="/dashboard/flow/build"
              icon={Compass}
              points={[
                pickText(uiLanguage, "Complete one focused step at a time", "一次只专注一个步骤"),
                pickText(uiLanguage, "Save draft at every step", "每一步都可保存草稿"),
                pickText(uiLanguage, "Generate, preview, edit, and export the draft", "生成、预览、编辑并导出草稿"),
              ]}
              progress={journey.build}
              started={journey.build.started}
              title={pickText(uiLanguage, "Build from scratch", "从零创建")}
              uiLanguage={uiLanguage}
            />
          </div>
        </section>
      </Reveal>
    </div>
  );
}
