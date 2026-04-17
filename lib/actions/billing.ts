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

    trackEvent("billing_checkout_started", {
      userId: snapshot.user.id,
      plan,
      mode: result.mode,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    redirect(result.redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing checkout failed.";
    redirect(`/dashboard/billing?error=${encodeURIComponent(message)}`);
  }
}

export async function openBillingPortalAction() {
  try {
    const snapshot = await requireSnapshot();
    const returnUrl = `${getAppBaseUrl()}/dashboard/billing`;

    const result = await createPortalFlow({
      snapshot,
      returnUrl,
    });

    trackEvent("billing_portal_opened", {
      userId: snapshot.user.id,
      mode: result.mode,
    });

    redirect(result.redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing portal is unavailable.";
    redirect(`/dashboard/billing?error=${encodeURIComponent(message)}`);
  }
}
