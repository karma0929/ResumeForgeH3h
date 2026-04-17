import { ConfigurationError } from "@/lib/errors";

type AppEnvironment = "local" | "preview" | "production";

function normalizeEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV;

  if (explicit === "local" || explicit === "preview" || explicit === "production") {
    return explicit;
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  return "local";
}

function readRequired(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const appEnv = normalizeEnvironment();
export const isLocalEnvironment = appEnv === "local";
export const isPreviewEnvironment = appEnv === "preview";
export const isProductionEnvironment = appEnv === "production";
export const allowDevelopmentMocks = isLocalEnvironment;

export function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getSessionSecret() {
  if (isLocalEnvironment) {
    return getOptionalEnv("SESSION_SECRET") ?? "local-development-session-secret";
  }

  return readRequired("SESSION_SECRET");
}

export function getAppBaseUrl() {
  if (isLocalEnvironment) {
    return getOptionalEnv("APP_BASE_URL") ?? "http://localhost:3000";
  }

  return readRequired("APP_BASE_URL");
}

export function requireDatabaseUrl() {
  return readRequired("DATABASE_URL");
}

export function requireOpenAIKey() {
  return readRequired("OPENAI_API_KEY");
}

export function getAIModel() {
  return getOptionalEnv("AI_OPENAI_MODEL") ?? "gpt-5";
}

export function requireStripeSecretKey() {
  return readRequired("STRIPE_SECRET_KEY");
}

export function requireStripeWebhookSecret() {
  return readRequired("STRIPE_WEBHOOK_SECRET");
}

export function requireStripePriceId(plan: "PRO" | "PREMIUM_REVIEW") {
  return readRequired(
    plan === "PRO" ? "STRIPE_PRICE_PRO_MONTHLY" : "STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY",
  );
}

export function getLaunchBlockers() {
  if (!isProductionEnvironment) {
    return [];
  }

  const required = [
    "APP_BASE_URL",
    "DATABASE_URL",
    "SESSION_SECRET",
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY",
  ];

  return required.filter((name) => !process.env[name]?.trim());
}

export function describeEnvironment() {
  return {
    appEnv,
    isLocalEnvironment,
    isPreviewEnvironment,
    isProductionEnvironment,
    allowDevelopmentMocks,
  };
}
