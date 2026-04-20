import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { loginAction } from "@/lib/actions/auth";
import { getSessionIdentity } from "@/lib/auth";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getSessionIdentity();

  if (identity) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const uiLanguage = await getUiLanguage();

  return (
    <AuthForm
      action={loginAction}
      description={pickText(
        uiLanguage,
        "Sign in with your email and password to access your ResumeForge workspace.",
        "使用邮箱和密码登录 ResumeForge 工作台。",
      )}
      error={queryValue(params, "error")}
      footer={
        <>
          {pickText(uiLanguage, "No account yet?", "还没有账号？")}{" "}
          <Link className="font-medium text-slate-900" href="/signup">
            {pickText(uiLanguage, "Create one", "立即注册")}
          </Link>
        </>
      }
      includeName={false}
      nextPath={sanitizePostAuthRedirectPath(queryValue(params, "next"))}
      submitLabel={pickText(uiLanguage, "Sign in", "登录")}
      title={pickText(uiLanguage, "Welcome back", "欢迎回来")}
      uiLanguage={uiLanguage}
    />
  );
}
