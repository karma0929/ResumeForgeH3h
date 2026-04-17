import Link from "next/link";
import { Sparkles } from "lucide-react";
import { allowDevelopmentMocks } from "@/lib/env";
import { demoLoginAction } from "@/lib/actions/auth";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link className="flex items-center gap-3 text-slate-950" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">ResumeForge</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Login</Link>
          <Link
            className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white"
            href="/signup"
          >
            Start free
          </Link>
        </nav>
        {allowDevelopmentMocks ? (
          <form action={demoLoginAction}>
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
              Demo account
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
