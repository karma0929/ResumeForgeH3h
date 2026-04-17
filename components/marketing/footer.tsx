import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-medium text-slate-800">ResumeForge</p>
          <p>AI-powered resume optimization for serious U.S. job searches.</p>
        </div>
        <div className="flex gap-6">
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
