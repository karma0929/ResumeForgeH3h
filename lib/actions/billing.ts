"use server";

import { revalidatePath } from "next/cache";
import { getSessionIdentity } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { getAppBaseUrl, isProductionEnvironment } from "@/lib/env";
import { createCheckoutFlow, createPortalFlow } from "@/lib/billing/service";
import { getAppSnapshot } from "@/lib/data";
import { AuthenticationError } from "@/lib/errors";
import type { SubscriptionPlan } from "@/lib/types";
import { assertEnumValue, readStringField } from "@/lib/validation";

async function requireSnapshot() {
  const identity = await getSessionIdentity();

  if (!identity) {
    throw new AuthenticationError("Please sign in to manage billing.");
  }

  return getAppSnapshot(identity);
}

function validateStripeConfigConsistency(): string | null {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? "";
  const premiumPriceId = process.env.STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY?.trim() ?? "";

  if (!stripeSecretKey) {
    return null;
  }

  const usesTestSecret = stripeSecretKey.startsWith("sk_test_");
  const usesLiveSecret = stripeSecretKey.startsWith("sk_live_");

  if (!usesTestSecret && !usesLiveSecret) {
    return "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.";
  }

  if (!isProductionEnvironment && usesLiveSecret) {
    return "Use Stripe test credentials in local/preview environments.";
  }

  if (usesTestSecret) {
    if (!stripeWebhookSecret.startsWith("whsec_")) {
      return "STRIPE_WEBHOOK_SECRET is invalid for Stripe test mode.";
    }

    if (!proPriceId.startsWith("price_") || !premiumPriceId.startsWith("price_")) {
      return "Stripe test mode requires STRIPE_PRICE_* values from test products.";
    }
  }

  return null;
}

export type BillingActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function startCheckoutAction(formData: FormData): Promise<BillingActionResult> {
  let redirectUrl = "/dashboard/billing";

  try {
    const stripeConfigError = validateStripeConfigConsistency();

    if (stripeConfigError) {
      throw new Error(stripeConfigError);
    }

    const snapshot = await requireSnapshot();
    const plan = assertEnumValue(
      readStringField(formData, "plan", { required: true, max: 32 }),
      ["FREE", "PRO", "PREMIUM_REVIEW"] as const,
      "plan",
    ) as SubscriptionPlan;
    const baseUrl = getAppBaseUrl();
    const successUrl = `${baseUrl}/dashboard/billing?checkout=success&plan=${plan}`;
    const cancelUrl = `${baseUrl}/dashboard/billing?checkout=cancelled&plan=${plan}`;

    const result = await createCheckoutFlow({
      snapshot,
      plan,
      successUrl,
      cancelUrl,
    });

    try {
      trackEvent("billing_checkout_started", {
        userId: snapshot.user.id,
        plan,
        mode: result.mode,
      });
    } catch (error) {
      console.error("BILLING TRACK EVENT ERROR:", error);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    redirectUrl = result.redirectUrl;
  } catch (error) {
    console.error("BILLING ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Billing checkout failed.",
    };
  }

  return {
    success: true,
    redirectTo: redirectUrl,
  };
}

export async function openBillingPortalAction(): Promise<BillingActionResult> {
  let redirectUrl = "/dashboard/billing";

  try {
    const stripeConfigError = validateStripeConfigConsistency();

    if (stripeConfigError) {
      throw new Error(stripeConfigError);
    }

    const snapshot = await requireSnapshot();
    const returnUrl = `${getAppBaseUrl()}/dashboard/billing`;

    const result = await createPortalFlow({
      snapshot,
      returnUrl,
    });

    try {
      trackEvent("billing_portal_opened", {
        userId: snapshot.user.id,
        mode: result.mode,
      });
    } catch (error) {
      console.error("BILLING TRACK EVENT ERROR:", error);
    }

    redirectUrl = result.redirectUrl;
  } catch (error) {
    console.error("BILLING ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Billing portal is unavailable.",
    };
  }

  return {
    success: true,
    redirectTo: redirectUrl,
  };
}
