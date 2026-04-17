import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";
import { loginAction } from "@/lib/actions/auth";

function queryValue(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <AuthForm
      action={loginAction}
      description="Sign in with your email and password to access your ResumeForge workspace."
      error={queryValue(params, "error")}
      footer={
        <>
          No account yet?{" "}
          <Link className="font-medium text-slate-900" href="/signup">
            Create one
          </Link>
        </>
      }
      includeName={false}
      nextPath={queryValue(params, "next")}
      submitLabel="Sign in"
      title="Welcome back"
    />
  );
}
