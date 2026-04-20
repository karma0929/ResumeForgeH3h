"use client";

import { useMemo, useState } from "react";

function normalizeMonth(value: string) {
  const match = value.match(/\b(\d{4})-(\d{2})\b/);
  if (!match) {
    return "";
  }
  return `${match[1]}-${match[2]}`;
}

export function MonthField({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue?: string;
  label: string;
}) {
  const normalizedDefault = useMemo(() => normalizeMonth(defaultValue ?? ""), [defaultValue]);
  const [month, setMonth] = useState(normalizedDefault);
  const [edited, setEdited] = useState(false);
  const hiddenValue = month || (!edited ? defaultValue || "" : "");

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input name={name} type="hidden" value={hiddenValue} />
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
        onChange={(event) => {
          setEdited(true);
          setMonth(event.target.value);
        }}
        type="month"
        value={month}
      />
    </label>
  );
}
