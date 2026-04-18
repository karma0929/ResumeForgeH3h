import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { signupAction } from "@/lib/actions/auth";
import { getSessionIdentity } from "@/lib/auth";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";

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

  return (
    <AuthForm
      action={signupAction}
      description="Create a real ResumeForge account with email and password authentication."
      error={queryValue(params, "error")}
      footer={
        <>
          Already have access?{" "}
          <Link className="font-medium text-slate-900" href="/login">
            Log in
          </Link>
        </>
      }
      nextPath={sanitizePostAuthRedirectPath(queryValue(params, "next"))}
      submitLabel="Create account"
      title="Start your ResumeForge workspace"
    />
  );
}
