import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { allowDevelopmentMocks, requireStripeWebhookSecret } from "@/lib/env";
import { ConfigurationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { getStripeClient, isStripeConfigured, validateStripeConfiguration } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/service";

export async function POST(request: Request) {
  let stripe = null;
  let webhookSecret = null;
  const stripeConfigured = isStripeConfigured();

  try {
    validateStripeConfiguration({ requireWebhookSecret: true });
    stripe = getStripeClient();
    webhookSecret = requireStripeWebhookSecret();
  } catch (error) {
    if (allowDevelopmentMocks && !stripeConfigured) {
      return NextResponse.json({
        received: true,
        mode: "mock",
        message: "Stripe webhook skipped because Stripe is not configured locally.",
      });
    }

    const message = error instanceof Error ? error.message : "Stripe webhook configuration is invalid.";
    logEvent("error", "Stripe webhook misconfiguration.", { message });
    return NextResponse.json({ error: "Stripe webhook configuration is invalid." }, { status: 503 });
  }

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook configuration is invalid." }, { status: 503 });
  }

  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    await handleStripeEvent(event);
    logEvent("info", "Stripe webhook processed successfully.", {
      eventType: event.type,
      eventId: event.id,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      logEvent("error", "Stripe webhook event handling failed due to configuration.", {
        error: error.message,
      });
      return NextResponse.json({ error: "Webhook handler configuration is invalid." }, { status: 503 });
    }

    logEvent("warn", "Stripe webhook verification failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 400 });
  }
}
