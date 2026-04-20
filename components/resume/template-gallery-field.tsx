"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ResumeTemplateDefinition } from "@/lib/resume-render";
import type { ResumeTemplateId, UILanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

const templatePreviewTone: Record<
  ResumeTemplateId,
  {
    shell: string;
    accent: string;
    column: "single" | "split";
  }
> = {
  classic_ats: {
    shell: "border-slate-200 bg-white",
    accent: "bg-slate-400",
    column: "single",
  },
  modern_professional: {
    shell: "border-sky-200 bg-gradient-to-br from-white to-sky-50/40",
    accent: "bg-gradient-to-r from-sky-500 to-cyan-500",
    column: "split",
  },
  technical_product: {
    shell: "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/45",
    accent: "bg-gradient-to-r from-emerald-500 to-teal-500",
    column: "split",
  },
  executive_leadership: {
    shell: "border-slate-300 bg-gradient-to-br from-white to-slate-50/45",
    accent: "bg-slate-800",
    column: "split",
  },
  minimal_bilingual: {
    shell: "border-indigo-200 bg-gradient-to-br from-white to-indigo-50/35",
    accent: "bg-indigo-400",
    column: "single",
  },
};

export function TemplateGalleryField({
  templates,
  defaultTemplateId,
  uiLanguage,
}: {
  templates: ResumeTemplateDefinition[];
  defaultTemplateId: ResumeTemplateId;
  uiLanguage: UILanguage;
}) {
  const firstTemplate = templates[0]?.id ?? "classic_ats";
  const initial = templates.some((template) => template.id === defaultTemplateId)
    ? defaultTemplateId
    : firstTemplate;
  const [selectedId, setSelectedId] = useState<ResumeTemplateId>(initial);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId),
    [templates, selectedId],
  );

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-slate-700">
        {uiLanguage === "zh" ? "模板库" : "Template library"}
      </legend>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const checked = selectedId === template.id;
          const tone = templatePreviewTone[template.id];

          return (
            <label
              className={cn(
                "group cursor-pointer rounded-2xl border bg-white p-3 transition",
                checked
                  ? "border-sky-300 ring-2 ring-sky-100"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
              )}
              key={template.id}
            >
              <input
                checked={checked}
                className="sr-only"
                name="templateId"
                onChange={() => setSelectedId(template.id)}
                type="radio"
                value={template.id}
              />

              <div className={cn("rounded-xl border p-2", tone.shell)}>
                <div className={cn("h-1.5 w-16 rounded-full", tone.accent)} />
                <div
                  className={cn(
                    "mt-2 grid gap-2",
                    tone.column === "split" ? "grid-cols-[1.25fr_0.75fr]" : "grid-cols-1",
                  )}
                >
                  <div className="space-y-1">
                    <div className="h-1.5 w-20 rounded-full bg-slate-300/80" />
                    <div className="h-1.5 w-full rounded-full bg-slate-200/80" />
                    <div className="h-1.5 w-5/6 rounded-full bg-slate-200/80" />
                    <div className="h-1.5 w-4/6 rounded-full bg-slate-200/80" />
                  </div>
                  {tone.column === "split" ? (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-slate-200/80" />
                      <div className="h-1.5 w-4/5 rounded-full bg-slate-200/80" />
                      <div className="h-1.5 w-2/3 rounded-full bg-slate-200/80" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {uiLanguage === "zh" ? template.name.zh : template.name.en}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {uiLanguage === "zh" ? template.description.zh : template.description.en}
                  </p>
                </div>
                {checked ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" /> : null}
              </div>

              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                {uiLanguage === "zh" ? template.useCase.zh : template.useCase.en}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    key={`${template.id}_${tag.en}`}
                  >
                    {uiLanguage === "zh" ? tag.zh : tag.en}
                  </span>
                ))}
              </div>
            </label>
          );
        })}
      </div>

      {selectedTemplate ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            {uiLanguage === "zh" ? "当前选择：" : "Selected:"}
          </span>{" "}
          {uiLanguage === "zh" ? selectedTemplate.name.zh : selectedTemplate.name.en}
        </div>
      ) : null}
    </fieldset>
  );
}

