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
            <span className="block rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition peer-checked:border-sky-300 peer-checked:bg-sky-50 peer-checked:text-sky-900 hover:border-slate-300">
              <span className="block font-medium">{option.label}</span>
              {option.hint ? <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span> : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

