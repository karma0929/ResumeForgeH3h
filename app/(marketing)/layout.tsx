import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNavbar } from "@/components/marketing/navbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </>
  );
}
