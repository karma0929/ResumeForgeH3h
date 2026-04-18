import Stripe from "stripe";
import {
  allowDevelopmentMocks,
  getOptionalEnv,
  isProductionEnvironment,
  requireStripePriceId,
  requireStripeSecretKey,
} from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";

export type StripeKeyMode = "test" | "live";

export interface StripeConfigurationState {
  configured: boolean;
  mode: StripeKeyMode | null;
  webhookSecret: string | null;
  proPriceId: string | null;
  premiumReviewPriceId: string | null;
}

function resolveStripeMode(secretKey: string): StripeKeyMode | null {
  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  return null;
}

export function isStripeConfigured() {
  return Boolean(getOptionalEnv("STRIPE_SECRET_KEY"));
}

export function readStripeConfiguration(): StripeConfigurationState {
  const secretKey = getOptionalEnv("STRIPE_SECRET_KEY");
  const webhookSecret = getOptionalEnv("STRIPE_WEBHOOK_SECRET");
  const proPriceId = getOptionalEnv("STRIPE_PRICE_PRO_MONTHLY");
  const premiumReviewPriceId = getOptionalEnv("STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY");

  if (!secretKey) {
    return {
      configured: false,
      mode: null,
      webhookSecret,
      proPriceId,
      premiumReviewPriceId,
    };
  }

  return {
    configured: true,
    mode: resolveStripeMode(secretKey),
    webhookSecret,
    proPriceId,
    premiumReviewPriceId,
  };
}

export function validateStripeConfiguration(input?: {
  requirePrices?: boolean;
  requireWebhookSecret?: boolean;
}): StripeConfigurationState {
  const state = readStripeConfiguration();

  if (!state.configured) {
    if (allowDevelopmentMocks) {
      return state;
    }

    throw new ConfigurationError("Stripe secret key is not configured.");
  }

  if (!state.mode) {
    throw new ConfigurationError("STRIPE_SECRET_KEY must begin with sk_test_ or sk_live_.");
  }

  if (!isProductionEnvironment && state.mode === "live") {
    throw new ConfigurationError("Live Stripe keys are not allowed outside production.");
  }

  if (state.webhookSecret && !state.webhookSecret.startsWith("whsec_")) {
    throw new ConfigurationError("STRIPE_WEBHOOK_SECRET must begin with whsec_.");
  }

  if (input?.requireWebhookSecret && !state.webhookSecret) {
    throw new ConfigurationError("STRIPE_WEBHOOK_SECRET is required.");
  }

  if (input?.requirePrices) {
    if (!state.proPriceId || !state.proPriceId.startsWith("price_")) {
      throw new ConfigurationError("STRIPE_PRICE_PRO_MONTHLY must be a valid Stripe price ID.");
    }

    if (!state.premiumReviewPriceId || !state.premiumReviewPriceId.startsWith("price_")) {
      throw new ConfigurationError(
        "STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY must be a valid Stripe price ID.",
      );
    }
  }

  return state;
}

export function getStripeClient() {
  if (!isStripeConfigured()) {
    if (allowDevelopmentMocks) {
      return null;
    }

    throw new ConfigurationError("Stripe secret key is not configured.");
  }

  return new Stripe(requireStripeSecretKey());
}

export function getStripePriceId(plan: "PRO" | "PREMIUM_REVIEW") {
  const priceId =
    plan === "PRO"
      ? getOptionalEnv("STRIPE_PRICE_PRO_MONTHLY")
      : getOptionalEnv("STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY");

  if (allowDevelopmentMocks && !priceId) {
    return null;
  }

  return priceId ?? requireStripePriceId(plan);
}
