import Link from "next/link";
import { GitCompareArrows, Layers3 } from "lucide-react";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { VersionCompare } from "@/components/dashboard/version-compare";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { getSessionIdentity } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/billing/guards";
import { getAppSnapshot } from "@/lib/data";
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

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Compare saved resume versions side by side and export the one you want to submit."
        title="Resume Versions"
      />

      {exported ? (
        <StatusBanner
          description="Your selected resume version was prepared for PDF export."
          title="Export started"
          tone="success"
        />
      ) : null}

      {snapshot.resumeVersions.length > 0 ? (
        <>
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <GitCompareArrows className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Comparison controls</p>
                <p className="text-lg font-semibold text-slate-950">
                  Choose the two versions to review
                </p>
              </div>
            </div>
            <form className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]" method="get">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Left version</span>
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
                <span className="mb-2 block text-sm font-medium text-slate-700">Right version</span>
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
                  Compare
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
            <p className="text-sm text-slate-500">Saved versions</p>
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
                        Compare
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
                        href="/dashboard/billing?upgradeFeature=version_compare"
                      >
                        Unlock compare
                      </Link>
                    )}
                    {canExport ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                        href={`/api/export?versionId=${version.id}&format=pdf`}
                      >
                        Export PDF
                      </Link>
                    ) : (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white"
                        href="/dashboard/billing?upgradeFeature=priority_export&blocked=1"
                      >
                        Unlock export
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
          ctaLabel="Create first version"
          description="Resume versions appear after you save a rewrite or tailored resume. Use the tailoring workspace to generate your first candidate-specific draft."
          icon={Layers3}
          title="No resume versions saved yet"
        />
      )}
    </div>
  );
}
