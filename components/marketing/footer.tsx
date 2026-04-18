import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="mt-24 border-t border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-12 text-sm text-slate-500 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-base font-semibold text-slate-900">ResumeForge</p>
          <p className="mt-3 max-w-md leading-7">
            Guided AI resume workflow for U.S. job seekers. Build stronger positioning, generate
            tailored versions, and ship application-ready drafts with confidence.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Product</p>
          <div className="flex flex-col gap-2">
            <Link className="transition-colors hover:text-slate-900" href="/#how-it-works">
              How it works
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/#capabilities">
              Capabilities
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/pricing">
              Pricing
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Account</p>
          <div className="flex flex-col gap-2">
            <Link className="transition-colors hover:text-slate-900" href="/login">
              Login
            </Link>
            <Link className="transition-colors hover:text-slate-900" href="/signup">
              Start free
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
