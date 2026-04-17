import Stripe from "stripe";
import {
  allowDevelopmentMocks,
  getOptionalEnv,
  requireStripePriceId,
  requireStripeSecretKey,
} from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";

export function isStripeConfigured() {
  return Boolean(getOptionalEnv("STRIPE_SECRET_KEY"));
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
  if (allowDevelopmentMocks) {
    return plan === "PRO"
      ? getOptionalEnv("STRIPE_PRICE_PRO_MONTHLY")
      : getOptionalEnv("STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY");
  }

  return requireStripePriceId(plan);
}
