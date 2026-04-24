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
        "rf-surface rounded-3xl p-6 transition-all",
        className,
      )}
    >
      {children}
    </div>
  );
}
