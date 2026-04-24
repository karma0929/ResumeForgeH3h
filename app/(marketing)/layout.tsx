import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNavbar } from "@/components/marketing/navbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rf-dark-ui relative isolate">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ambient-glow ambient-glow-a" />
        <div className="ambient-glow ambient-glow-b" />
        <div className="ambient-grid" />
      </div>
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
