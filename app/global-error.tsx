"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Application error</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            ResumeForge could not render this request.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {error.message || "Check the deployment logs and runtime configuration."}
          </p>
        </div>
      </body>
    </html>
  );
}
