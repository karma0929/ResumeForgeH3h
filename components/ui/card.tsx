import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-all",
        className,
      )}
    >
      {children}
    </div>
  );
}
