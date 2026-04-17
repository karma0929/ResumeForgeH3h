import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondary,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondary?: ReactNode;
}) {
  return (
    <Card className="border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50">
      <div className="flex flex-col gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {ctaLabel && ctaHref ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
              href={ctaHref}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          {secondary}
        </div>
      </div>
    </Card>
  );
}
