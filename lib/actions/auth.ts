"use server";

import { redirect } from "next/navigation";
import { clearSession, createSession } from "@/lib/auth";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import { trackEvent } from "@/lib/analytics";
import { allowDevelopmentMocks, getSessionSecret } from "@/lib/env";
import { AuthenticationError, ConfigurationError, ValidationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { createCredentialUser, findUserForLogin } from "@/lib/data";
import { hashPassword, verifyPassword } from "@/lib/password";
import { readEmailField, readPasswordField, readStringField } from "@/lib/validation";

function reportNonCriticalAuthSideEffectError(action: "login" | "signup", error: unknown) {
  console.error(`[AUTH ${action.toUpperCase()} SIDE EFFECT ERROR]`, error);
}

function assertAuthConfiguration() {
  // Force validation before DB mutations to avoid "user created but session failed" flows.
  getSessionSecret();
}

export type AuthActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const rawNext = formData.get("next");
  const requestedNext = typeof rawNext === "string" ? rawNext : null;
  const redirectPath = sanitizePostAuthRedirectPath(requestedNext) ?? "/dashboard";

  try {
    assertAuthConfiguration();

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

    return {
      success: true,
      redirectTo: redirectPath,
    };
  } catch (error) {
    console.error("AUTH ERROR:", error);

    const message =
      error instanceof ConfigurationError
        ? "Authentication is temporarily unavailable. Please contact support."
        : error instanceof ValidationError || error instanceof AuthenticationError
          ? error.message
          : "Unable to sign in.";

    return {
      success: false,
      error: message,
    };
  }
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const rawNext = formData.get("next");
  const requestedNext = typeof rawNext === "string" ? rawNext : null;
  const redirectPath = sanitizePostAuthRedirectPath(requestedNext) ?? "/dashboard";

  try {
    assertAuthConfiguration();

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

    return {
      success: true,
      redirectTo: redirectPath,
    };
  } catch (error) {
    console.error("AUTH ERROR:", error);

    const message =
      error instanceof ConfigurationError
        ? "Authentication is temporarily unavailable. Please contact support."
        : error instanceof ValidationError || error instanceof AuthenticationError
          ? error.message
          : "Unable to create account.";

    return {
      success: false,
      error: message,
    };
  }
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
