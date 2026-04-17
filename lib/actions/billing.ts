"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionIdentity } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { getAppBaseUrl } from "@/lib/env";
import { createCheckoutFlow, createPortalFlow } from "@/lib/billing/service";
import { getAppSnapshot } from "@/lib/data";
import type { SubscriptionPlan } from "@/lib/types";
import { assertEnumValue, readStringField } from "@/lib/validation";

async function requireSnapshot() {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect("/login");
  }

  return getAppSnapshot(identity);
}

export async function startCheckoutAction(formData: FormData) {
  let redirectUrl = "/dashboard/billing";

  try {
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
    const message = error instanceof Error ? error.message : "Billing checkout failed.";
    redirectUrl = `/dashboard/billing?error=${encodeURIComponent(message)}`;
  }

  redirect(redirectUrl);
}

export async function openBillingPortalAction() {
  let redirectUrl = "/dashboard/billing";

  try {
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
    const message = error instanceof Error ? error.message : "Billing portal is unavailable.";
    redirectUrl = `/dashboard/billing?error=${encodeURIComponent(message)}`;
  }

  redirect(redirectUrl);
}
