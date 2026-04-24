import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
  hint?: string;
}

export function SegmentedOptionGroup({
  name,
  options,
  defaultValue,
  className,
}: {
  name: string;
  options: SegmentedOption[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {options.map((option) => {
        const id = `${name}_${option.value}`;
        return (
          <label className="block cursor-pointer" htmlFor={id} key={option.value}>
            <input
              className="peer sr-only"
              defaultChecked={defaultValue === option.value}
              id={id}
              name={name}
              type="radio"
              value={option.value}
            />
            <span className="block rounded-2xl border border-slate-600/45 bg-slate-900/75 px-3 py-2.5 text-sm text-slate-200 transition hover:border-slate-300/60 hover:bg-slate-800/85 peer-focus-visible:border-cyan-300 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400/30 peer-checked:border-cyan-300/80 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500/22 peer-checked:to-blue-500/28 peer-checked:text-slate-100">
              <span className="block font-medium">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block text-xs text-slate-400 peer-checked:text-cyan-100">{option.hint}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
