import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardTopNavigation } from "@/components/dashboard/top-navigation";
import { getSessionIdentity } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/data";
import { getUiLanguage } from "@/lib/i18n-server";

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
  const uiLanguage = await getUiLanguage();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ambient-glow ambient-glow-a" />
        <div className="ambient-glow ambient-glow-b" />
        <div className="ambient-grid" />
      </div>
      <div className="relative">
        <DashboardTopNavigation uiLanguage={uiLanguage} user={snapshot.user} />
        <main className="mx-auto min-w-0 w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="rounded-[32px] border border-white/40 bg-white/72 p-4 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
