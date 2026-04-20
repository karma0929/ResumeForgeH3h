"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getTemplatePreviewModel,
  type ResumeRenderModel,
  type ResumeTemplateDefinition,
} from "@/lib/resume-render";
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
          const previewModel = getTemplatePreviewModel({
            templateId: template.id,
            language: uiLanguage === "zh" ? "zh" : "en",
          });

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

              <TemplateMiniPreview model={previewModel} tone={tone} />

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

function TemplateMiniPreview({
  model,
  tone,
}: {
  model: ResumeRenderModel;
  tone: (typeof templatePreviewTone)[ResumeTemplateId];
}) {
  const primary = tone.column === "split" ? model.sections.slice(0, 2) : model.sections.slice(0, 3);
  const secondary = tone.column === "split" ? model.sections.slice(2, 4) : [];

  return (
    <div className={cn("rounded-xl border p-2.5", tone.shell)}>
      <div className="truncate text-[11px] font-semibold text-slate-800">{model.name}</div>
      <div className={cn("mt-1 h-1 w-16 rounded-full", tone.accent)} />
      <div
        className={cn(
          "mt-2 grid gap-2",
          tone.column === "split" ? "grid-cols-[1.25fr_0.75fr]" : "grid-cols-1",
        )}
      >
        <div className="space-y-2">
          {primary.map((section) => (
            <div className="space-y-1" key={section.key}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {section.title}
              </p>
              {section.lines.slice(0, 1).map((line) => (
                <p className="line-clamp-1 text-[9px] leading-4 text-slate-700" key={`${section.key}_${line}`}>
                  {line}
                </p>
              ))}
              {section.bullets.slice(0, 2).map((bullet) => (
                <p
                  className="line-clamp-1 text-[9px] leading-4 text-slate-700"
                  key={`${section.key}_${bullet}`}
                >
                  • {bullet}
                </p>
              ))}
            </div>
          ))}
        </div>

        {tone.column === "split" ? (
          <div className="space-y-2 border-l border-slate-200/80 pl-2">
            {secondary.map((section) => (
              <div className="space-y-1" key={`side_${section.key}`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {section.title}
                </p>
                {section.lines.slice(0, 1).map((line) => (
                  <p
                    className="line-clamp-1 text-[9px] leading-4 text-slate-700"
                    key={`side_${section.key}_${line}`}
                  >
                    {line}
                  </p>
                ))}
                {section.bullets.slice(0, 1).map((bullet) => (
                  <p
                    className="line-clamp-1 text-[9px] leading-4 text-slate-700"
                    key={`side_${section.key}_${bullet}`}
                  >
                    • {bullet}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
