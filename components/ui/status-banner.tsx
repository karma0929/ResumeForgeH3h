import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "info";

const toneStyles: Record<StatusTone, string> = {
  success: "border-emerald-400/45 bg-emerald-950/30 text-emerald-100",
  warning: "border-amber-400/45 bg-amber-950/25 text-amber-100",
  info: "border-cyan-400/45 bg-cyan-950/30 text-cyan-100",
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
    <div className={cn("rounded-2xl border px-4 py-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.9)]", toneStyles[tone], className)}>
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
