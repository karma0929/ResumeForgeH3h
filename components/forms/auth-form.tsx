import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  footer,
  error,
  nextPath,
  includeName = true,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  footer: React.ReactNode;
  error?: string | null;
  nextPath?: string | null;
  includeName?: boolean;
}) {
  return (
    <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
      <Link className="text-sm font-medium text-slate-500" href="/">
        Back to home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <form action={action} className="mt-8 space-y-5">
        {includeName ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              name="name"
              placeholder="Aarav Patel"
              required
              type="text"
            />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>
        {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
        <SubmitButton className="w-full">{submitLabel}</SubmitButton>
      </form>
      <div className="mt-6 text-sm text-slate-600">{footer}</div>
    </div>
  );
}
