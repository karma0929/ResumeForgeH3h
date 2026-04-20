"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function parseTokens(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TokenInputField({
  name,
  label,
  defaultValue,
  placeholder,
  helperText,
  className,
}: {
  name: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  helperText?: string;
  className?: string;
}) {
  const [tokens, setTokens] = useState<string[]>(() => parseTokens(defaultValue ?? ""));
  const [draft, setDraft] = useState("");

  const serialized = useMemo(() => tokens.join(", "), [tokens]);

  const appendTokens = (values: string[]) => {
    if (values.length === 0) {
      return;
    }
    setTokens((prev) => {
      const merged = [...prev];
      for (const value of values) {
        if (!merged.some((item) => item.toLowerCase() === value.toLowerCase())) {
          merged.push(value);
        }
      }
      return merged;
    });
  };

  const commitDraft = () => {
    const parsed = parseTokens(draft);
    appendTokens(parsed);
    setDraft("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <span className="block text-sm font-medium text-slate-700">{label}</span> : null}
      <input name={name} type="hidden" value={serialized} />

      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {tokens.map((token) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
              key={token}
            >
              {token}
              <button
                aria-label={`Remove ${token}`}
                className="rounded-full p-0.5 text-sky-700 hover:bg-sky-100"
                onClick={() => setTokens((prev) => prev.filter((item) => item !== token))}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[150px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            onBlur={commitDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commitDraft();
              }
              if (event.key === "Backspace" && !draft && tokens.length > 0) {
                setTokens((prev) => prev.slice(0, -1));
              }
            }}
            placeholder={placeholder}
            value={draft}
          />
        </div>
      </div>
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}
