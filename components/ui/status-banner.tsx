import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "info";

const toneStyles: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

const toneIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
};

export function StatusBanner({
  title,
  description,
  tone = "info",
  className,
}: {
  title: string;
  description?: string;
  tone?: StatusTone;
  className?: string;
}) {
  const Icon = toneIcons[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-4 shadow-sm", toneStyles[tone], className)}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 opacity-90">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
