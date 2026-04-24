"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function normalizeMonth(value: string) {
  if (!value) {
    return "";
  }
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return "";
  }
  return `${match[1]}-${match[2]}`;
}

function extractMonths(value: string) {
  const matches = value.match(/\b\d{4}-\d{2}\b/g) ?? [];
  const lower = value.toLowerCase();
  const isPresent = /present|current|至今|现在/.test(lower);
  return {
    start: normalizeMonth(matches[0] ?? ""),
    end: normalizeMonth(matches[1] ?? ""),
    isPresent,
  };
}

function composeRange(start: string, end: string, currentLabel: string, presentLabel: string, isPresent: boolean) {
  const normalizedStart = normalizeMonth(start);
  const normalizedEnd = normalizeMonth(end);

  if (normalizedStart && normalizedEnd) {
    return `${normalizedStart} to ${normalizedEnd}`;
  }
  if (normalizedStart && (isPresent || !normalizedEnd)) {
    return `${normalizedStart} to ${presentLabel}`;
  }
  if (!normalizedStart && normalizedEnd) {
    return normalizedEnd;
  }
  return currentLabel;
}

export function MonthRangeField({
  name,
  defaultValue,
  startLabel,
  endLabel,
  className,
  presentLabel = "Present",
}: {
  name: string;
  defaultValue?: string;
  startLabel: string;
  endLabel: string;
  className?: string;
  presentLabel?: string;
}) {
  const initial = useMemo(() => extractMonths(defaultValue ?? ""), [defaultValue]);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [isPresent, setIsPresent] = useState(initial.isPresent || (!initial.end && Boolean(initial.start)));
  const [edited, setEdited] = useState(false);
  const [currentLabel] = useState(defaultValue ?? "");
  const hiddenValue = composeRange(start, end, edited ? "" : currentLabel, presentLabel, isPresent);

  return (
    <div className={cn("space-y-2", className)}>
      <input name={name} type="hidden" value={hiddenValue} />
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">{startLabel}</span>
          <input
            className="h-11 w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-3 text-sm text-slate-100"
            onChange={(event) => {
              setEdited(true);
              setStart(event.target.value);
            }}
            type="month"
            value={start}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">{endLabel}</span>
          <input
            className="h-11 w-full rounded-2xl border border-slate-600/55 bg-slate-950/60 px-3 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPresent}
            onChange={(event) => {
              setEdited(true);
              setEnd(event.target.value);
              if (event.target.value) {
                setIsPresent(false);
              }
            }}
            type="month"
            value={end}
          />
        </label>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
        <input
          checked={isPresent}
          className="h-4 w-4 rounded border border-slate-500/65 bg-slate-900 text-cyan-400 accent-cyan-400"
          onChange={(event) => {
            setEdited(true);
            setIsPresent(event.target.checked);
            if (event.target.checked) {
              setEnd("");
            }
          }}
          type="checkbox"
        />
        <span>{presentLabel}</span>
      </label>
    </div>
  );
}
