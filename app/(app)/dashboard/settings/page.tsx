import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card } from "@/components/ui/card";
import { StatusBanner } from "@/components/ui/status-banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSettingsAction } from "@/lib/actions/dashboard";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { appEnv, allowDevelopmentMocks, isProductionEnvironment } from "@/lib/env";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const identity = await getSessionIdentity();
  const snapshot = await getAppSnapshot(identity);
  const saved = queryValue(params, "saved");
  const error = queryValue(params, "error");

  return (
    <div className="space-y-8">
      <DashboardHeader
        description="Update your core profile fields, target role, and environment settings for the workspace."
        title="Settings"
      />

      {saved ? (
        <StatusBanner
          description="Your workspace profile has been updated."
          title="Settings saved"
          tone="success"
        />
      ) : null}

      {error ? (
        <StatusBanner
          description={error}
          title="Settings update unavailable"
          tone="warning"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <form action={updateSettingsAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={snapshot.user.name}
                  name="name"
                  type="text"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  defaultValue={snapshot.user.location}
                  name="location"
                  type="text"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Headline</span>
              <textarea
                className="min-h-[120px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7"
                defaultValue={snapshot.user.headline}
                name="headline"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Target role</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                defaultValue={snapshot.user.targetRole}
                name="targetRole"
                type="text"
              />
            </label>
            <SubmitButton>Save settings</SubmitButton>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-sm text-slate-500">Environment</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Database mode</p>
                <p className="mt-2 text-sm text-slate-600">
                  {allowDevelopmentMocks
                    ? "Local development allows isolated simulation paths when external services are unavailable."
                    : "Production data path with no development fallback behavior."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Auth mode</p>
                <p className="mt-2 text-sm text-slate-600">
                  Email and password authentication with signed HttpOnly session cookies.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Runtime environment</p>
                <p className="mt-2 text-sm text-slate-600">
                  {appEnv} {isProductionEnvironment ? "launch candidate mode" : "pre-production mode"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Integration notes</p>
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              OpenAI, Stripe, PostgreSQL, and PDF export paths are wired for launch. PDF and DOCX resume ingestion remains intentionally out of scope until a safe parser pipeline is added.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
