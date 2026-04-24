"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import type { AuthActionResult } from "@/lib/actions/auth";
import type { UILanguage } from "@/lib/types";
import { pickText } from "@/lib/i18n";

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  footer,
  error,
  nextPath,
  includeName = true,
  uiLanguage,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<AuthActionResult>;
  submitLabel: string;
  footer: React.ReactNode;
  error?: string | null;
  nextPath?: string | null;
  includeName?: boolean;
  uiLanguage: UILanguage;
}) {
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
          window.location.assign(result.redirectTo);
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
    <div className="rf-surface w-full max-w-md rounded-[32px] p-8">
      <Link className="text-sm font-medium text-slate-300 hover:text-slate-100" href="/">
        {pickText(uiLanguage, "Back to home", "返回首页")}
      </Link>
      <div className="mt-4">
        <LanguageSwitcher currentLanguage={uiLanguage} />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-50">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      {localError ? (
        <div className="mt-5 rounded-2xl border border-rose-400/45 bg-rose-950/25 px-4 py-3 text-sm text-rose-100">
          {localError}
        </div>
      ) : null}
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {includeName ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              {pickText(uiLanguage, "Full name", "姓名")}
            </span>
            <input
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
              disabled={pending}
              name="name"
              placeholder={pickText(uiLanguage, "Aarav Patel", "张三")}
              required
              type="text"
            />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            {pickText(uiLanguage, "Email", "邮箱")}
          </span>
          <input
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
            disabled={pending}
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">
            {pickText(uiLanguage, "Password", "密码")}
          </span>
          <input
            className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition"
            disabled={pending}
            minLength={8}
            name="password"
            placeholder={pickText(uiLanguage, "At least 8 characters", "至少 8 个字符")}
            required
            type="password"
          />
        </label>
        {safeNextPath ? <input name="next" type="hidden" value={safeNextPath} /> : null}
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? pickText(uiLanguage, "Please wait...", "请稍候...") : submitLabel}
        </Button>
      </form>
      <div className="mt-6 text-sm text-slate-300">{footer}</div>
    </div>
  );
}
