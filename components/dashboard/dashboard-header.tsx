import type { ReactNode } from "react";

export function DashboardHeader({
  title,
  description,
  action,
  workspaceLabel = "ResumeForge Workspace",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  workspaceLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/55 bg-white/64 p-5 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{workspaceLabel}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
