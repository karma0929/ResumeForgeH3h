import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSessionIdentity } from "@/lib/auth";
import { getAdminMetrics, getAppSnapshot } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect("/login?next=/admin");
  }

  const snapshot = await getAppSnapshot(identity);

  if (snapshot.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const metrics = await getAdminMetrics();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">ResumeForge metrics</h1>
          <p className="mt-3 text-sm text-slate-600">Operational metrics for the production admin surface.</p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          helper="Users with workspaces."
          icon={<Users className="h-5 w-5" />}
          label="Users"
          value={String(metrics.users)}
        />
        <MetricCard
          helper="Stored resumes in the system."
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Resumes"
          value={String(metrics.resumes)}
        />
        <MetricCard
          helper="Saved AI generations."
          icon={<Sparkles className="h-5 w-5" />}
          label="AI Generations"
          value={String(metrics.generations)}
        />
        <MetricCard
          helper="Projected monthly revenue from active subscriptions."
          icon={<Badge>MRR</Badge>}
          label="MRR"
          value={formatCurrency(metrics.monthlyRevenue)}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <p className="text-sm text-slate-500">Plan distribution</p>
          <div className="mt-5 space-y-3">
            {Object.entries(metrics.planDistribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{plan.replace("_", " ")}</p>
                <Badge>{String(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Recent payments</p>
          <div className="mt-5 space-y-4">
            {metrics.recentPayments.map((payment: (typeof metrics.recentPayments)[number]) => (
              <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                  <p className="mt-1 text-sm text-slate-600">{payment.provider}</p>
                </div>
                <div className="text-right">
                  <Badge>{payment.status}</Badge>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
