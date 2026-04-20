import Link from "next/link";
import { ArrowRight, GitCompareArrows, Layers3 } from "lucide-react";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ResumePreview } from "@/components/resume/resume-preview";
import { VersionCompare } from "@/components/dashboard/version-compare";
import { WorkflowStepper } from "@/components/dashboard/workflow-stepper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSessionIdentity } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getAppSnapshot } from "@/lib/data";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import { getWorkflowAction, getWorkflowState } from "@/lib/onboarding";
import {
  buildResumeRenderModel,
  isResumeOutputLanguage,
  isResumeTemplateId,
  RESUME_TEMPLATES,
} from "@/lib/resume-render";
import { formatDate } from "@/lib/utils";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function VersionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const uiLanguage = await getUiLanguage();
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const exported = queryValue(params, "exported");
  const leftId = queryValue(params, "leftId") ?? snapshot.resumeVersions[0]?.id;
  const rightId =
    queryValue(params, "rightId") ??
    snapshot.resumeVersions[1]?.id ??
    snapshot.resumeVersions[0]?.id;
  const left = snapshot.resumeVersions.find((item) => item.id === leftId) ?? snapshot.resumeVersions[0];
  const right =
    snapshot.resumeVersions.find((item) => item.id === rightId) ??
    snapshot.resumeVersions[1] ??
    snapshot.resumeVersions[0];
  const canCompare = hasFeatureAccess(snapshot.subscription?.plan, "version_compare");
  const canExport = hasFeatureAccess(snapshot.subscription?.plan, "priority_export");
  const leftResume = left ? snapshot.resumes.find((item) => item.id === left.resumeId) : null;
  const selectedLanguage = isResumeOutputLanguage(queryValue(params, "lang"))
    ? (queryValue(params, "lang") as "en" | "zh")
    : leftResume?.profileData?.preferences.outputLanguage || "en";
  const selectedTemplate = isResumeTemplateId(queryValue(params, "template"))
    ? (queryValue(params, "template") as "classic_ats" | "modern_professional" | "technical_product")
    : leftResume?.profileData?.preferences.templateId || "classic_ats";
  const previewModel =
    left && leftResume?.profileData
      ? buildResumeRenderModel({
          version: left,
          profileData: leftResume.profileData,
          requestedLanguage: selectedLanguage,
          requestedTemplate: selectedTemplate,
        })
      : null;
  const exportSuffix = `&lang=${encodeURIComponent(selectedLanguage)}&template=${encodeURIComponent(selectedTemplate)}`;
  const workflow = getWorkflowState(snapshot);
  const nextAction = getWorkflowAction(snapshot);

  return (
    <div className="space-y-8">
      <DashboardHeader
        description={pickText(
          uiLanguage,
          "Compare saved resume versions side by side and export the one you want to submit.",
          "并排对比已保存的简历版本，并导出最终投递版本。",
        )}
        title={pickText(uiLanguage, "Resume Versions", "简历版本")}
      />

      {exported ? (
        <StatusBanner
          description={t("Your selected resume version was prepared for PDF export.", "所选简历版本已准备好进行 PDF 导出。")}
          title={t("Export started", "导出已开始")}
          tone="success"
        />
      ) : null}

      <WorkflowStepper compact currentStepId="versions" workflow={workflow} />

      {snapshot.resumeVersions.length > 0 ? (
        <>
          <Card>
            <p className="text-sm text-slate-500">
              {t("Preview and export settings", "预览与导出设置")}
            </p>
            <form className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]" method="get">
              <input name="leftId" type="hidden" value={left?.id ?? ""} />
              <input name="rightId" type="hidden" value={right?.id ?? ""} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Resume output language", "简历输出语言")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={selectedLanguage}
                  name="lang"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Template", "模板")}
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={selectedTemplate}
                  name="template"
                >
                  {RESUME_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {uiLanguage === "zh" ? template.name.zh : template.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800">
                  {t("Update preview", "更新预览")}
                </button>
              </div>
            </form>
          </Card>

          {previewModel ? <ResumePreview model={previewModel} /> : null}

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <GitCompareArrows className="h-5 w-5" />
              </div>
              <div>
              <p className="text-sm text-slate-500">{t("Comparison controls", "对比设置")}</p>
              <p className="text-lg font-semibold text-slate-950">
                  {t("Choose the two versions to review", "选择要对比的两个版本")}
              </p>
            </div>
            </div>
            <form className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]" method="get">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Left version", "左侧版本")}</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={left?.id}
                  name="leftId"
                >
                  {snapshot.resumeVersions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t("Right version", "右侧版本")}</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={right?.id}
                  name="rightId"
                >
                  {snapshot.resumeVersions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800">
                  {t("Compare", "对比")}
                </button>
              </div>
            </form>
          </Card>

          {canCompare && left && right ? (
            <VersionCompare left={left} right={right} />
          ) : (
            <UpgradePrompt feature="version_compare" />
          )}

          <Card>
            <p className="text-sm text-slate-500">{t("Saved versions", "已保存版本")}</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {snapshot.resumeVersions.map((version) => (
                <div key={version.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{version.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{version.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{version.type}</Badge>
                      {typeof version.score === "number" ? (
                        <Badge className="bg-slate-900 text-white">{version.score}/100</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{formatDate(version.createdAt)}</p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {canCompare ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
                        href={`/dashboard/versions?leftId=${version.id}&rightId=${right?.id ?? version.id}`}
                      >
                        {t("Compare", "对比")}
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
                        href="/dashboard/billing?upgradeFeature=version_compare"
                      >
                        {t("Unlock compare", "解锁对比")}
                      </Link>
                    )}
                    {canExport ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                        href={`/api/export?versionId=${version.id}&format=pdf${exportSuffix}`}
                      >
                        {pickText(uiLanguage, "Export PDF", "导出 PDF")}
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                        href="/dashboard/billing?upgradeFeature=priority_export&blocked=1"
                      >
                        {t("Unlock export", "解锁导出")}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <EmptyState
          ctaHref="/dashboard/tailoring"
          ctaLabel={t("Create first version", "创建首个版本")}
          description={t(
            "Resume versions appear after you save a rewrite or tailored resume. Use the tailoring workspace to generate your first candidate-specific draft.",
            "保存改写或定制简历后会生成版本。请在定制工作区生成首个岗位定向草稿。",
          )}
          icon={Layers3}
          title={t("No resume versions saved yet", "尚无已保存版本")}
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
