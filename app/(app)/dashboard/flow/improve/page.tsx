import Link from "next/link";
import { ArrowLeft, ArrowRight, FileUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card } from "@/components/ui/card";

export default function ImproveFlowPage() {
  return (
    <div className="space-y-7">
      <DashboardHeader
        action={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
            href="/dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to start
          </Link>
        }
        description="This path is being streamlined next. For now, use the Build from scratch workflow for the full guided experience."
        title="Improve Existing Resume (Upcoming)"
      />

      <Card className="border-slate-200 bg-white/92 p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
            <FileUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Full improve workflow is temporarily parked
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              We are focusing on a single high-quality path first. Use the build path to complete a
              full end-to-end guided questionnaire, generate a resume draft, and export it.
            </p>
          </div>
        </div>
        <div className="mt-7">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
            href="/dashboard/flow/build"
          >
            Go to build workflow
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
