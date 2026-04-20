import Link from "next/link";
import { ArrowLeft, ArrowRight, FileUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card } from "@/components/ui/card";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";

export default async function ImproveFlowPage() {
  const uiLanguage = await getUiLanguage();

  return (
    <div className="space-y-7">
      <DashboardHeader
        action={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            {pickText(uiLanguage, "Back to start", "返回起点")}
          </Link>
        }
        description={pickText(
          uiLanguage,
          "This path is being streamlined next. For now, use the Build from scratch workflow for the full guided experience.",
          "该路径正在重构中。当前请使用“从零创建”以体验完整引导流程。",
        )}
        title={pickText(uiLanguage, "Improve Existing Resume (Upcoming)", "优化现有简历（即将上线）")}
      />

      <Card className="border-slate-200 bg-white/92 p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
            <FileUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {pickText(uiLanguage, "Full improve workflow is temporarily parked", "完整优化流程暂时下线重构")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {pickText(
                uiLanguage,
                "We are focusing on a single high-quality path first. Use the build path to complete a full end-to-end guided questionnaire, generate a resume draft, and export it.",
                "当前先聚焦一条高质量主路径。你可以通过“从零创建”完成端到端问卷、生成草稿并导出。",
              )}
            </p>
          </div>
        </div>
        <div className="mt-7">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href="/dashboard/flow/build"
          >
            {pickText(uiLanguage, "Go to build workflow", "前往创建流程")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
