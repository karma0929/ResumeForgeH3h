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
    <div className="rf-surface rounded-3xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{workspaceLabel}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
