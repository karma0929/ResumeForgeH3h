"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import type { AuthActionResult } from "@/lib/actions/auth";

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
  action: (formData: FormData) => Promise<AuthActionResult>;
  submitLabel: string;
  footer: React.ReactNode;
  error?: string | null;
  nextPath?: string | null;
  includeName?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState(error ?? null);
  const safeNextPath = sanitizePostAuthRedirectPath(nextPath);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLocalError(null);

    startTransition(async () => {
      try {
        const result = await action(formData);

        if (result.success) {
          router.push(result.redirectTo);
          router.refresh();
          return;
        }

        setLocalError(result.error);
      } catch (error) {
        console.error("AUTH FORM SUBMIT ERROR:", error);
        setLocalError("Authentication is temporarily unavailable. Please try again.");
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
      <Link className="text-sm font-medium text-slate-500" href="/">
        Back to home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      {localError ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {localError}
        </div>
      ) : null}
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {includeName ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              disabled={pending}
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
            disabled={pending}
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
            disabled={pending}
            minLength={8}
            name="password"
            placeholder="At least 8 characters"
            required
            type="password"
          />
        </label>
        {safeNextPath ? <input name="next" type="hidden" value={safeNextPath} /> : null}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Please wait..." : submitLabel}
        </Button>
      </form>
      <div className="mt-6 text-sm text-slate-600">{footer}</div>
    </div>
  );
}
