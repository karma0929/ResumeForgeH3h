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
  return {
    start: normalizeMonth(matches[0] ?? ""),
    end: normalizeMonth(matches[1] ?? ""),
  };
}

function composeRange(start: string, end: string, currentLabel: string) {
  const normalizedStart = normalizeMonth(start);
  const normalizedEnd = normalizeMonth(end);

  if (normalizedStart && normalizedEnd) {
    return `${normalizedStart} to ${normalizedEnd}`;
  }
  if (normalizedStart && !normalizedEnd) {
    return `${normalizedStart} to Present`;
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
}: {
  name: string;
  defaultValue?: string;
  startLabel: string;
  endLabel: string;
  className?: string;
}) {
  const initial = useMemo(() => extractMonths(defaultValue ?? ""), [defaultValue]);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [edited, setEdited] = useState(false);
  const [currentLabel] = useState(defaultValue ?? "");
  const hiddenValue = composeRange(start, end, edited ? "" : currentLabel);

  return (
    <div className={cn("space-y-2", className)}>
      <input name={name} type="hidden" value={hiddenValue} />
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{startLabel}</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            onChange={(event) => {
              setEdited(true);
              setStart(event.target.value);
            }}
            type="month"
            value={start}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{endLabel}</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            onChange={(event) => {
              setEdited(true);
              setEnd(event.target.value);
            }}
            type="month"
            value={end}
          />
        </label>
      </div>
    </div>
  );
}
