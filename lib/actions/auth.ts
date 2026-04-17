"use server";

import { redirect } from "next/navigation";
import { clearSession, createSession } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { allowDevelopmentMocks } from "@/lib/env";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { createCredentialUser, findUserForLogin } from "@/lib/data";
import { hashPassword, verifyPassword } from "@/lib/password";
import { readEmailField, readInternalPath, readPasswordField, readStringField } from "@/lib/validation";

function safeNextPath(formData: FormData) {
  const raw = formData.get("next");

  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function reportNonCriticalAuthSideEffectError(action: "login" | "signup", error: unknown) {
  console.error(`[AUTH ${action.toUpperCase()} SIDE EFFECT ERROR]`, error);
}

export async function loginAction(formData: FormData) {
  const fallbackNextPath = safeNextPath(formData) ?? "/dashboard";
  let nextPath = fallbackNextPath;

  try {
    nextPath = readInternalPath(formData) ?? "/dashboard";

    const email = readEmailField(formData);
    const password = readPasswordField(formData);
    const user = await findUserForLogin(email);

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new AuthenticationError("Invalid email or password.");
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    try {
      logEvent("info", "User logged in.", { userId: user.id });
    } catch (error) {
      reportNonCriticalAuthSideEffectError("login", error);
    }

    try {
      trackEvent("auth_login_success", { userId: user.id });
    } catch (error) {
      reportNonCriticalAuthSideEffectError("login", error);
    }
  } catch (error) {
    console.error("LOGIN FAILED RAW ERROR:", error);
    console.error(
      "LOGIN FAILED MESSAGE:",
      error instanceof Error ? error.message : String(error),
    );

    const message =
      error instanceof ValidationError || error instanceof AuthenticationError
        ? error.message
        : "Unable to sign in.";

    const nextQuery = fallbackNextPath ? `&next=${encodeURIComponent(fallbackNextPath)}` : "";
    redirect(`/login?error=${encodeURIComponent(message)}${nextQuery}`);
  }

  redirect(nextPath);
}

export async function signupAction(formData: FormData) {
  const fallbackNextPath = safeNextPath(formData) ?? "/dashboard";
  let nextPath = fallbackNextPath;

  try {
    nextPath = readInternalPath(formData) ?? "/dashboard";

    const email = readEmailField(formData);
    const name = readStringField(formData, "name", { required: true, min: 2, max: 80 });
    const password = readPasswordField(formData);

    const user = await createCredentialUser({
      email,
      name,
      passwordHash: await hashPassword(password),
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    try {
      logEvent("info", "User signed up.", { userId: user.id });
    } catch (error) {
      reportNonCriticalAuthSideEffectError("signup", error);
    }

    try {
      trackEvent("auth_signup_success", { userId: user.id });
    } catch (error) {
      reportNonCriticalAuthSideEffectError("signup", error);
    }
  } catch (error) {
    console.error("SIGNUP FAILED RAW ERROR:", error);
    console.error(
      "SIGNUP FAILED MESSAGE:",
      error instanceof Error ? error.message : String(error),
    );

    const message =
      error instanceof ValidationError || error instanceof AuthenticationError
        ? error.message
        : "Unable to create account.";

    const nextQuery = fallbackNextPath ? `&next=${encodeURIComponent(fallbackNextPath)}` : "";
    redirect(`/signup?error=${encodeURIComponent(message)}${nextQuery}`);
  }

  redirect(nextPath);
}

export async function demoLoginAction() {
  if (!allowDevelopmentMocks) {
    redirect("/login?error=Demo%20mode%20is%20disabled%20outside%20local%20development.");
  }

  await createSession({
    userId: "local-demo-user",
    email: "demo@resumeforge.dev",
    name: "Aarav Patel",
    role: "ADMIN",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}