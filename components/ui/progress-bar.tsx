export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border border-slate-600/35 bg-slate-900/75">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
