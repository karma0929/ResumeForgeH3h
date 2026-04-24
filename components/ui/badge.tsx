import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-500/40 bg-slate-900/75 px-3 py-1 text-xs font-medium text-slate-200",
        className,
      )}
    >
      {children}
    </span>
  );
}
