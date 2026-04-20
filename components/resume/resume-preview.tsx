import { cn } from "@/lib/utils";
import type { ResumeRenderModel } from "@/lib/resume-render";

function templateClasses(templateId: ResumeRenderModel["templateId"]) {
  if (templateId === "modern_professional") {
    return {
      shell: "border-slate-300 bg-white shadow-[0_28px_80px_-45px_rgba(15,23,42,0.45)]",
      heading: "text-slate-900 border-slate-300",
      section: "border-slate-200",
      bullet: "text-slate-700",
    };
  }

  if (templateId === "technical_product") {
    return {
      shell: "border-sky-200 bg-gradient-to-br from-white to-sky-50/40 shadow-[0_30px_90px_-55px_rgba(2,132,199,0.5)]",
      heading: "text-sky-900 border-sky-200",
      section: "border-sky-100",
      bullet: "text-slate-700",
    };
  }

  return {
    shell: "border-slate-300 bg-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.45)]",
    heading: "text-slate-900 border-slate-300",
    section: "border-slate-200",
    bullet: "text-slate-700",
  };
}

export function ResumePreview({ model }: { model: ResumeRenderModel }) {
  const theme = templateClasses(model.templateId);
  const isTechnical = model.templateId === "technical_product";
  const primarySections = isTechnical
    ? model.sections.filter((section) => !["skills", "projects", "certifications", "links"].includes(section.key))
    : model.sections;
  const sideSections = isTechnical
    ? model.sections.filter((section) => ["skills", "projects", "certifications", "links"].includes(section.key))
    : [];

  return (
    <article className={cn("rounded-[28px] border p-7", theme.shell)}>
      <header className={cn("border-b pb-4", theme.heading)}>
        <h2 className="text-[1.65rem] font-semibold tracking-tight">{model.name}</h2>
        {model.headline ? <p className="mt-2 text-sm text-slate-600">{model.headline}</p> : null}
        {model.contactLine ? <p className="mt-2 text-xs text-slate-500">{model.contactLine}</p> : null}
      </header>

      {model.summary ? (
        <section className={cn("mt-5 border-b pb-5", theme.section)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {model.language === "zh" ? "个人摘要" : "Summary"}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{model.summary}</p>
        </section>
      ) : null}

      <div className={cn("mt-5", isTechnical ? "grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" : "space-y-5")}>
        <div className="space-y-5">
          {primarySections.map((section) => (
            <section key={section.key}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {section.title}
              </p>
              <div className="mt-2 space-y-2">
                {section.lines.map((line) => (
                  <p className="text-sm leading-6 text-slate-700" key={`${section.key}_${line}`}>
                    {line}
                  </p>
                ))}
                {section.bullets.map((bullet) => (
                  <p className={cn("text-sm leading-6", theme.bullet)} key={`${section.key}_${bullet}`}>
                    • {bullet}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {isTechnical ? (
          <aside className="space-y-5 rounded-2xl border border-sky-100 bg-white/70 p-4">
            {sideSections.map((section) => (
              <section key={section.key}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {section.title}
                </p>
                <div className="mt-2 space-y-2">
                  {section.lines.map((line) => (
                    <p className="text-sm leading-6 text-slate-700" key={`${section.key}_${line}`}>
                      {line}
                    </p>
                  ))}
                  {section.bullets.map((bullet) => (
                    <p className={cn("text-sm leading-6", theme.bullet)} key={`${section.key}_${bullet}`}>
                      • {bullet}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        ) : null}
      </div>
    </article>
  );
}
