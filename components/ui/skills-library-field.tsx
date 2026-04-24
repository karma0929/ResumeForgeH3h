"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { pickText } from "@/lib/i18n";
import type { UILanguage } from "@/lib/types";

function parseTokens(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(input: string) {
  return input.trim().toLowerCase();
}

export interface SkillsLibraryGroup {
  id: string;
  label: { en: string; zh: string };
  items: string[];
}

export function SkillsLibraryField({
  name,
  label,
  defaultValue,
  placeholder,
  helperText,
  groups,
  uiLanguage,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  helperText?: string;
  groups: SkillsLibraryGroup[];
  uiLanguage: UILanguage;
}) {
  const t = (en: string, zh: string) => pickText(uiLanguage, en, zh);
  const [tokens, setTokens] = useState<string[]>(() => parseTokens(defaultValue ?? ""));
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id ?? "all");

  const selectedSet = useMemo(() => new Set(tokens.map((item) => normalize(item))), [tokens]);
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const suggestions = useMemo(() => {
    const source =
      activeGroup === "all"
        ? allItems
        : groups.find((group) => group.id === activeGroup)?.items ?? [];
    const keyword = normalize(query);
    return source
      .filter((item) => !selectedSet.has(normalize(item)))
      .filter((item) => (keyword ? normalize(item).includes(keyword) : true))
      .slice(0, 12);
  }, [activeGroup, allItems, groups, query, selectedSet]);

  const serialized = tokens.join(", ");

  function appendToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      return;
    }
    if (selectedSet.has(normalize(trimmed))) {
      return;
    }
    setTokens((prev) => [...prev, trimmed]);
    setQuery("");
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-200">{label}</span>
      <input name={name} type="hidden" value={serialized} />
      <div className="rounded-2xl border border-slate-600/55 bg-slate-950/60 p-3">
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((token) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-950/45 px-2.5 py-1 text-xs text-cyan-100"
              key={token}
            >
              {token}
              <button
                className="rounded-full p-0.5 text-cyan-100/90 hover:bg-cyan-400/20"
                onClick={() =>
                  setTokens((prev) => prev.filter((item) => normalize(item) !== normalize(token)))
                }
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-600/55 bg-slate-900/70 px-2.5 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (suggestions[0]) {
                  appendToken(suggestions[0]);
                } else {
                  appendToken(query);
                }
              }
            }}
            placeholder={placeholder ?? t("Search or add a skill", "搜索或添加技能")}
            value={query}
          />
          {query ? (
            <button
              className="rounded-full border border-slate-500/70 px-2 py-1 text-xs text-slate-200 hover:border-cyan-300/65 hover:text-cyan-100"
              onClick={() => appendToken(query)}
              type="button"
            >
              {t("Add", "添加")}
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            className={`rounded-full border px-2.5 py-1 text-xs ${
              activeGroup === "all"
                ? "border-cyan-300/70 bg-cyan-950/35 text-cyan-100"
                : "border-slate-600/55 text-slate-300 hover:border-slate-400/75"
            }`}
            onClick={() => setActiveGroup("all")}
            type="button"
          >
            {t("All", "全部")}
          </button>
          {groups.map((group) => (
            <button
              className={`rounded-full border px-2.5 py-1 text-xs ${
                activeGroup === group.id
                  ? "border-cyan-300/70 bg-cyan-950/35 text-cyan-100"
                  : "border-slate-600/55 text-slate-300 hover:border-slate-400/75"
              }`}
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              type="button"
            >
              {pickText(uiLanguage, group.label.en, group.label.zh)}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                className="rounded-full border border-slate-600/55 bg-slate-900/72 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-300/65 hover:text-cyan-100"
                key={item}
                onClick={() => appendToken(item)}
                type="button"
              >
                {item}
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-400">
              {t("No matching suggestion. Add custom skill.", "没有匹配项，可直接添加自定义技能。")}
            </span>
          )}
        </div>
      </div>
      {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : null}
    </div>
  );
}
