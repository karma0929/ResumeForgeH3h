"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function FieldHelp({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/60 bg-slate-900/70 text-slate-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        type="button"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
      {open ? (
        <span
          className="absolute left-0 top-6 z-20 w-60 rounded-xl border border-slate-600/55 bg-slate-950/95 p-2.5 text-xs leading-5 text-slate-200 shadow-xl"
          id={panelId}
          role="tooltip"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
