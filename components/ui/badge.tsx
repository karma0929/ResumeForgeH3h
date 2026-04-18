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
        "inline-flex items-center rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
