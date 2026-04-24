import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="rf-dark-ui relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ambient-glow ambient-glow-a" />
        <div className="ambient-glow ambient-glow-b" />
        <div className="ambient-grid" />
      </div>
      {children}
    </main>
  );
}
