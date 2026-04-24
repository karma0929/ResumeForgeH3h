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
    shell: "border-slate-500/45 bg-slate-900/78",
    accent: "bg-slate-300",
    column: "single",
  },
  modern_professional: {
    shell: "border-sky-400/45 bg-gradient-to-br from-slate-900 to-sky-950/30",
    accent: "bg-gradient-to-r from-sky-400 to-cyan-300",
    column: "split",
  },
  technical_product: {
    shell: "border-emerald-400/45 bg-gradient-to-br from-slate-900 to-emerald-950/25",
    accent: "bg-gradient-to-r from-emerald-400 to-teal-300",
    column: "split",
  },
  executive_leadership: {
    shell: "border-slate-400/45 bg-gradient-to-br from-slate-900 to-slate-800/70",
    accent: "bg-slate-100",
    column: "split",
  },
  minimal_bilingual: {
    shell: "border-indigo-400/45 bg-gradient-to-br from-slate-900 to-indigo-950/25",
    accent: "bg-indigo-300",
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
    <fieldset className="space-y-4 rounded-[22px] border border-slate-600/42 bg-slate-900/78 p-4 backdrop-blur-sm">
      <legend className="px-1 text-sm font-semibold text-slate-100">
        {uiLanguage === "zh" ? "模板库" : "Template library"}
      </legend>
      <p className="text-xs text-slate-300">
        {uiLanguage === "zh"
          ? "选择版式会直接影响预览与导出效果。建议先看缩略预览再确定模板。"
          : "Template choice directly changes preview and export layout. Review thumbnails before selecting."}
      </p>

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
                "group cursor-pointer rounded-2xl border bg-slate-900/82 p-3 transition",
                checked
                  ? "border-cyan-300/75 ring-2 ring-cyan-400/22"
                  : "border-slate-600/45 hover:-translate-y-0.5 hover:border-slate-300/70 hover:shadow-[0_16px_30px_-22px_rgba(14,165,233,0.4)]",
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
                  <p className="text-sm font-semibold text-slate-100">
                    {uiLanguage === "zh" ? template.name.zh : template.name.en}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {uiLanguage === "zh" ? template.description.zh : template.description.en}
                  </p>
                </div>
                {checked ? <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> : null}
              </div>

              <p className="mt-2 text-[11px] leading-4 text-slate-400">
                {uiLanguage === "zh" ? template.useCase.zh : template.useCase.en}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    className="rounded-full border border-slate-500/45 bg-slate-800/86 px-2 py-0.5 text-[10px] font-medium text-slate-200"
                    key={`${template.id}_${tag.en}`}
                  >
                    {uiLanguage === "zh" ? tag.zh : tag.en}
                  </span>
                ))}
              </div>
              {checked ? (
                <p className="mt-2 text-[11px] font-medium text-cyan-200">
                  {uiLanguage === "zh" ? "当前已选模板" : "Currently selected"}
                </p>
              ) : null}
            </label>
          );
        })}
      </div>

      {selectedTemplate ? (
        <div className="rounded-2xl border border-slate-600/42 bg-slate-900/76 p-3 text-xs text-slate-300">
          <span className="font-medium text-slate-100">
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
      <div className="truncate text-[11px] font-semibold text-slate-100">{model.name}</div>
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
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {section.title}
              </p>
              {section.lines.slice(0, 1).map((line) => (
                <p className="line-clamp-1 text-[9px] leading-4 text-slate-200" key={`${section.key}_${line}`}>
                  {line}
                </p>
              ))}
              {section.bullets.slice(0, 2).map((bullet) => (
                <p
                  className="line-clamp-1 text-[9px] leading-4 text-slate-200"
                  key={`${section.key}_${bullet}`}
                >
                  • {bullet}
                </p>
              ))}
            </div>
          ))}
        </div>

        {tone.column === "split" ? (
          <div className="space-y-2 border-l border-slate-500/50 pl-2">
            {secondary.map((section) => (
              <div className="space-y-1" key={`side_${section.key}`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {section.title}
                </p>
                {section.lines.slice(0, 1).map((line) => (
                  <p
                    className="line-clamp-1 text-[9px] leading-4 text-slate-200"
                    key={`side_${section.key}_${line}`}
                  >
                    {line}
                  </p>
                ))}
                {section.bullets.slice(0, 1).map((bullet) => (
                  <p
                    className="line-clamp-1 text-[9px] leading-4 text-slate-200"
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
