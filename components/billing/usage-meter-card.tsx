import { Card } from "@/components/ui/card";

export function UsageMeterCard({
  label,
  used,
  limit,
  description,
}: {
  label: string;
  used: number;
  limit: number | null;
  description: string;
}) {
  const unlimited = limit === null;
  const percent = unlimited ? 100 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-slate-950">
            {used}
            {unlimited ? "" : `/${limit}`}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <div className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 p-1">
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
            style={{ opacity: 0.35 + percent / 160 }}
          >
            {unlimited ? "∞" : `${Math.max(limit - used, 0)}`}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Card>
  );
}
