import Link from "next/link";
import { ArrowRight, WandSparkles } from "lucide-react";
import { UsageLimitPrompt } from "@/components/billing/usage-limit-prompt";
import { UsageMeterCard } from "@/components/billing/usage-meter-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  runBulletRewriteAction,
  runTailoredDraftAction,
  saveTailoredVersionAction,
} from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import { getUsageRemaining } from "@/lib/usage";
import type { RewriteMode, RewriteResult, TailoredResumeOutput } from "@/lib/types";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TailoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const rewriteModes: Array<{ value: RewriteMode; label: string }> = [
    { value: "shorter", label: t("Shorter", "更精简") },
    { value: "more_technical", label: t("More technical", "更技术化") },
    { value: "leadership_focused", label: t("Leadership-focused", "突出领导力") },
    { value: "tailored_to_jd", label: t("Tailored to JD", "贴合 JD") },
  ];
  const resumeId = queryValue(params, "resumeId") ?? snapshot.resumes[0]?.id;
  const jobDescriptionId =
    queryValue(params, "jobDescriptionId") ?? snapshot.jobDescriptions[0]?.id;
  const mode = (queryValue(params, "mode") as RewriteMode) ?? "tailored_to_jd";
  const error = queryValue(params, "error");
  const rewriteRequested = queryValue(params, "rewrite");
  const draftRequested = queryValue(params, "draft");
  const saved = queryValue(params, "saved");
  const rewriteSaved = queryValue(params, "rewriteSaved");
  const resume = snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0];
  const jobDescription =
    snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ??
    snapshot.jobDescriptions[0];
  const bullet =
    queryValue(params, "bullet") ??
    resume?.parsed.experienceBullets[0] ??
    "Built a student-facing dashboard.";

  const rewriteGeneration =
    snapshot.aiGenerations.find((generation) => {
      if (
        generation.type !== "BULLET_REWRITE" ||
        generation.resumeId !== resume?.id ||
        generation.jobDescriptionId !== jobDescription?.id
      ) {
        return false;
      }

      const input = generation.input as { bullet?: string; mode?: string };
      return input.bullet === bullet && input.mode === mode;
    }) ?? null;
  const rewrite =
    rewriteRequested && rewriteGeneration
      ? (rewriteGeneration.output as unknown as RewriteResult)
      : null;
  const rewriteError =
    rewriteRequested && !rewriteGeneration
      ? t("Unable to load the latest rewrite output. Try generating it again.", "无法加载最新改写结果，请重新生成。")
      : null;

  const draftGeneration =
    snapshot.aiGenerations.find((generation) => {
      if (
        generation.type !== "TAILORED_RESUME" ||
        generation.resumeId !== resume?.id ||
        generation.jobDescriptionId !== jobDescription?.id
      ) {
        return false;
      }

      const input = generation.input as { draft?: boolean };
      return input.draft === true;
    }) ?? null;
  const tailored =
    draftRequested && draftGeneration
      ? (draftGeneration.output as unknown as TailoredResumeOutput)
      : null;
  const draftError =
    draftRequested && !draftGeneration
      ? t("Unable to load the latest tailored draft. Try generating it again.", "无法加载最新定制草稿，请重新生成。")
      : null;

  const actionError = error ?? rewriteError ?? draftError;
  const canSaveTailored = hasFeatureAccess(snapshot.subscription?.plan, "tailored_resume");
  const rewriteRemaining = getUsageRemaining(
    snapshot.subscription?.plan,
    snapshot.usage,
    "bullet_rewrite",
  );
  const workflow = getWorkflowState(snapshot);
  const nextAction = getWorkflowAction(snapshot);

  return (
    <div className="space-y-8">
      <DashboardHeader
        description={pickText(
          uiLanguage,
          "Rewrite individual bullets, preview why the rewrite is better, and save a job-specific resume version.",
          "改写单条 Bullet，查看优化原因，并保存岗位定向版本。",
        )}
        title={pickText(uiLanguage, "Job Tailoring", "岗位定向优化")}
      />

      {saved ? (
        <StatusBanner
          description={t(
            "The tailored resume version is now saved under Resume Versions and ready to compare or export.",
            "定制版本已保存到“简历版本”，可继续对比或导出。",
          )}
          title={t("Tailored version saved", "定制版本已保存")}
          tone="success"
        />
      ) : null}

      {rewriteSaved ? (
        <StatusBanner
          description={t(
            "The rewrite snapshot is stored, so you can revisit this phrasing while refining the full version.",
            "改写快照已保存，后续完善完整版本时可随时回看。",
          )}
          title={t("Bullet rewrite saved", "Bullet 改写已保存")}
          tone="success"
        />
      ) : null}

      {actionError ? (
        <StatusBanner
          description={actionError}
          title={t("Tailoring action unavailable", "定制操作暂不可用")}
          tone="warning"
        />
      ) : null}

      {draftRequested && tailored ? (
        <StatusBanner
          description={t("Your tailored draft is ready to review, refine, and save as a version.", "定制草稿已生成，可复核、优化并保存为版本。")}
          title={t("Tailored draft generated", "定制草稿已生成")}
          tone="success"
        />
      ) : null}

      <WorkflowStepper compact currentStepId="tailored" workflow={workflow} />

      {resume && jobDescription ? (
        <>
          <Card>
            <form action={runBulletRewriteAction} className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Resume", "简历")}</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={resume.id}
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
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Job description", "岗位描述")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={jobDescription.id}
                  name="jobDescriptionId"
                >
                  {snapshot.jobDescriptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.company} · {item.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Mode", "模式")}</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={mode}
                  name="mode"
                >
                  {rewriteModes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="xl:col-span-3">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Bullet to rewrite", "要改写的 Bullet")}
                </span>
                <textarea
                  className="min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                  defaultValue={bullet}
                  name="bullet"
                />
              </label>
              <div className="xl:col-span-3">
                {rewriteRemaining === null || rewriteRemaining > 0 ? (
                  <SubmitButton pendingLabel={t("Generating rewrite...", "正在生成改写...")}>{t("Generate rewrite", "生成改写")}</SubmitButton>
                ) : (
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
                    href="/dashboard/billing?usageLimit=bullet_rewrite&blocked=1"
                  >
                    {t("Upgrade for more rewrites", "升级解锁更多改写")}
                  </Link>
                )}
              </div>
            </form>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <UsageMeterCard
              description={
                rewriteRemaining === null
                  ? t("Your current plan includes unlimited bullet rewrite attempts.", "当前套餐包含不限次 Bullet 改写。")
                  : t(
                      `${rewriteRemaining} bullet ${rewriteRemaining === 1 ? "rewrite" : "rewrites"} left on the free plan.`,
                      `免费版剩余 ${rewriteRemaining} 次 Bullet 改写机会。`,
                    )
              }
              label={t("Bullet rewrite usage", "Bullet 改写用量")}
              limit={rewriteRemaining === null ? null : snapshot.usage.bulletRewritesUsed + rewriteRemaining}
              used={snapshot.usage.bulletRewritesUsed}
            />
            <Card>
              <p className="text-sm text-slate-500">{t("Tailored resume generation", "定制简历生成")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {t("Build a submission-ready draft", "生成可投递草稿")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t(
                  "Generate a job-specific version that reflects the selected role, company, and keyword profile.",
                  "生成与目标岗位、公司和关键词画像匹配的定制版本。",
                )}
              </p>
              <div className="mt-6">
                {canSaveTailored ? (
                  <form action={runTailoredDraftAction}>
                    <input name="resumeId" type="hidden" value={resume.id} />
                    <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                    <SubmitButton pendingLabel={t("Generating draft...", "正在生成草稿...")}>{t("Generate tailored resume", "生成定制简历")}</SubmitButton>
                  </form>
                ) : (
                  <UsageLimitPrompt compact action="tailored_draft" />
                )}
              </div>
            </Card>
          </div>

          {rewrite ? (
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <p className="text-sm text-slate-500">{t("Before", "改写前")}</p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{rewrite.before}</p>
                <p className="mt-6 text-sm text-slate-500">{t("After", "改写后")}</p>
                <p className="mt-4 rounded-2xl bg-slate-950 px-5 py-4 text-sm leading-7 text-white">
                  {rewrite.after}
                </p>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  {t(
                    "This rewrite is saved automatically and available in your AI generation history.",
                    "该改写会自动保存，可在 AI 生成历史中回看。",
                  )}
                </div>
              </Card>

              <Card>
                <p className="text-sm text-slate-500">{t("Why this is better", "为什么更好")}</p>
                <div className="mt-5 space-y-3">
                  {rewrite.whyBetter.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <p className="text-sm text-slate-500">{t("Inserted keywords", "新增关键词")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rewrite.insertedKeywords.map((keyword) => (
                      <Badge key={keyword}>{keyword}</Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {tailored ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{t("Tailored resume preview", "定制简历预览")}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {tailored.name}
                    </h2>
                  </div>
                  <Badge>{tailored.score}/100</Badge>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{tailored.summary}</p>
                <div className="mt-6 space-y-3">
                  {tailored.highlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <form action={saveTailoredVersionAction} className="mt-6 space-y-4">
                  <input name="resumeId" type="hidden" value={resume.id} />
                  <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      {t("Version name", "版本名称")}
                    </span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      defaultValue={tailored.name}
                      name="customName"
                      type="text"
                    />
                  </label>
                  {canSaveTailored ? (
                    <SubmitButton pendingLabel="Saving version...">
                      {t("Save tailored version", "保存定制版本")}
                    </SubmitButton>
                  ) : (
                    <UsageLimitPrompt compact action="tailored_draft" />
                  )}
                </form>
              </Card>

              <Card>
                <p className="text-sm text-slate-500">{t("Generated content preview", "生成内容预览")}</p>
                <pre className="mt-5 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-3xl bg-slate-50 p-5 font-mono text-xs leading-6 text-slate-700">
                  {tailored.content}
                </pre>
                <div className="mt-5">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-800"
                    href="/dashboard/versions"
                  >
                    {t("Review saved versions", "查看已保存版本")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50">
              <p className="text-sm text-slate-500">{t("Tailored resume preview", "定制简历预览")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {t("Generate a JD-specific draft", "生成 JD 定向草稿")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {t(
                  "ResumeForge will reshape your summary and bullets around the selected role so you can review fit before saving a final version.",
                  "ResumeForge 会围绕目标岗位重塑你的摘要与 Bullet，方便你先检查匹配度再保存最终版本。",
                )}
              </p>
              <div className="mt-6">
                {canSaveTailored ? (
                  <form action={runTailoredDraftAction}>
                    <input name="resumeId" type="hidden" value={resume.id} />
                    <input name="jobDescriptionId" type="hidden" value={jobDescription.id} />
                    <SubmitButton pendingLabel={t("Generating draft...", "正在生成草稿...")}>{t("Generate tailored resume", "生成定制简历")}</SubmitButton>
                  </form>
                ) : (
                  <UsageLimitPrompt compact action="tailored_draft" />
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <EmptyState
          ctaHref="/dashboard/upload"
          ctaLabel={t("Set up resume and JD", "先准备简历与 JD")}
          description={t(
            "Tailoring needs both a source resume and a target job description. Once those are saved, you can rewrite bullets and generate candidate-specific resume versions.",
            "定制功能需要同时具备源简历与目标岗位描述。保存后即可改写 Bullet 并生成岗位定向版本。",
          )}
          icon={WandSparkles}
          title={t("Tailoring workspace is waiting on source material", "定制工作区等待基础资料")}
        />
      )}

      <Card className="bg-gradient-to-br from-slate-50 to-white">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Next best action", "下一步建议")}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          {nextAction.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{nextAction.description}</p>
        <div className="mt-5">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href={nextAction.href}
          >
            {nextAction.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
