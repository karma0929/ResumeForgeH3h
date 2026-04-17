import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getOnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect("/login");
  }

  const snapshot = await getAppSnapshot(identity);
  const onboarding = getOnboardingProgress(snapshot);

  return (
    <div className="min-h-screen bg-transparent lg:grid lg:grid-cols-[280px_1fr]">
      <DashboardSidebar onboarding={onboarding} user={snapshot.user} />
      <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}
