import type { ReactNode } from "react";

export function DashboardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ResumeForge Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
