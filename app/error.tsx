"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          ResumeForge hit an unexpected error.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {error.message || "Try again, and if the issue persists review the server logs."}
        </p>
        <button
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
