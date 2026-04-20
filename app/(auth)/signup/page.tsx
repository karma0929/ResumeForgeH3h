import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { signupAction } from "@/lib/actions/auth";
import { getSessionIdentity } from "@/lib/auth";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({
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
      action={signupAction}
      description={pickText(
        uiLanguage,
        "Create a real ResumeForge account with email and password authentication.",
        "使用邮箱和密码创建 ResumeForge 账号。",
      )}
      error={queryValue(params, "error")}
      footer={
        <>
          {pickText(uiLanguage, "Already have access?", "已有账号？")}{" "}
          <Link className="font-medium text-slate-900" href="/login">
            {pickText(uiLanguage, "Log in", "去登录")}
          </Link>
        </>
      }
      nextPath={sanitizePostAuthRedirectPath(queryValue(params, "next"))}
      submitLabel={pickText(uiLanguage, "Create account", "创建账号")}
      title={pickText(uiLanguage, "Start your ResumeForge workspace", "开始使用 ResumeForge")}
      uiLanguage={uiLanguage}
    />
  );
}
