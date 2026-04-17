import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { allowDevelopmentMocks } from "@/lib/env";
import { ExternalServiceError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getPlanDefinition } from "@/lib/billing/plans";
import { getStripeClient, getStripePriceId, isStripeConfigured } from "@/lib/billing/stripe";
import type { AppSnapshot, SubscriptionPlan } from "@/lib/types";

interface CheckoutFlowInput {
  snapshot: AppSnapshot;
  plan: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
}

interface PortalFlowInput {
  snapshot: AppSnapshot;
  returnUrl: string;
}

export interface CheckoutFlowResult {
  mode: "mock" | "stripe";
  redirectUrl: string;
}

function planPrice(plan: SubscriptionPlan) {
  return getPlanDefinition(plan).monthlyPrice;
}

function entitlementsForPlan(plan: SubscriptionPlan) {
  const definition = getPlanDefinition(plan);
  return Object.entries(definition.featureAccess)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
}

function withQueryValue(url: string, key: string, value: string) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set(key, value);
  return nextUrl.toString();
}

async function updateSubscriptionRecord(input: {
  userId: string;
  plan: SubscriptionPlan;
  provider: "MOCK" | "STRIPE";
  status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}) {
  if (!isDatabaseConfigured) {
    return null;
  }

  return prisma.subscription.upsert({
    where: { userId: input.userId },
    update: {
      plan: input.plan,
      provider: input.provider,
      status: input.status ?? "ACTIVE",
      priceMonthly: planPrice(input.plan),
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
      stripePriceId: input.stripePriceId ?? undefined,
      stripeProductId: input.stripeProductId ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      entitlements: entitlementsForPlan(input.plan) as unknown as Prisma.InputJsonValue,
    },
    create: {
      userId: input.userId,
      plan: input.plan,
      provider: input.provider,
      status: input.status ?? "ACTIVE",
      priceMonthly: planPrice(input.plan),
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      stripePriceId: input.stripePriceId ?? null,
      stripeProductId: input.stripeProductId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      entitlements: entitlementsForPlan(input.plan) as unknown as Prisma.InputJsonValue,
    },
  });
}

async function createPaymentRecord(input: {
  userId: string;
  subscriptionId?: string | null;
  amount: number;
  provider: "MOCK" | "STRIPE";
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  externalId?: string | null;
  stripeInvoiceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured) {
    return null;
  }

  return prisma.payment.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId ?? null,
      amount: input.amount,
      currency: "USD",
      provider: input.provider,
      status: input.status,
      externalId: input.externalId ?? null,
      stripeInvoiceId: input.stripeInvoiceId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function createBillingSessionRecord(input: {
  userId: string;
  subscriptionId?: string | null;
  provider: "MOCK" | "STRIPE";
  type: "CHECKOUT" | "PORTAL";
  status: "OPEN" | "COMPLETED" | "EXPIRED" | "FAILED";
  plan?: SubscriptionPlan | null;
  externalId?: string | null;
  externalCustomerId?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured) {
    return null;
  }

  return prisma.billingSession.create({
    data: {
      userId: input.userId,
      subscriptionId: input.subscriptionId ?? null,
      provider: input.provider,
      type: input.type,
      status: input.status,
      plan: input.plan ?? null,
      externalId: input.externalId ?? null,
      externalCustomerId: input.externalCustomerId ?? null,
      url: input.url ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

async function ensureStripeCustomer(
  stripe: Stripe,
  snapshot: AppSnapshot,
): Promise<{ customerId: string }> {
  const existingCustomerId = snapshot.subscription?.stripeCustomerId;

  if (existingCustomerId) {
    return { customerId: existingCustomerId };
  }

  const customer = await stripe.customers.create({
    email: snapshot.user.email,
    name: snapshot.user.name,
    metadata: {
      userId: snapshot.user.id,
    },
  });

  await updateSubscriptionRecord({
    userId: snapshot.user.id,
    plan: snapshot.subscription?.plan ?? "FREE",
    provider: "STRIPE",
    status: snapshot.subscription?.status ?? "ACTIVE",
    stripeCustomerId: customer.id,
    stripeSubscriptionId: snapshot.subscription?.stripeSubscriptionId ?? null,
    stripePriceId: null,
    stripeProductId: null,
    currentPeriodEnd: snapshot.subscription?.currentPeriodEnd
      ? new Date(snapshot.subscription.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: snapshot.subscription?.cancelAtPeriodEnd ?? false,
  });

  return { customerId: customer.id };
}

async function runMockCheckout(input: CheckoutFlowInput): Promise<CheckoutFlowResult> {
  if (!allowDevelopmentMocks) {
    throw new ExternalServiceError("Stripe is not configured for checkout in this environment.");
  }

  const subscription = await updateSubscriptionRecord({
    userId: input.snapshot.user.id,
    plan: input.plan,
    provider: "MOCK",
    status: "ACTIVE",
    currentPeriodEnd:
      input.plan === "FREE" ? null : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });

  await createPaymentRecord({
    userId: input.snapshot.user.id,
    subscriptionId: subscription?.id ?? input.snapshot.subscription?.id ?? null,
    amount: planPrice(input.plan),
    provider: "MOCK",
    status: "PAID",
    externalId: `mock_${input.plan.toLowerCase()}_${Date.now()}`,
    metadata: {
      plan: input.plan,
      fallback: true,
    },
  });

  await createBillingSessionRecord({
    userId: input.snapshot.user.id,
    subscriptionId: subscription?.id ?? input.snapshot.subscription?.id ?? null,
    provider: "MOCK",
    type: "CHECKOUT",
    status: "COMPLETED",
    plan: input.plan,
    url: input.successUrl,
    metadata: {
      fallback: true,
    },
  });

  return {
    mode: "mock",
    redirectUrl: withQueryValue(withQueryValue(input.successUrl, "checkout", "mock"), "plan", input.plan),
  };
}

export async function createCheckoutFlow(input: CheckoutFlowInput): Promise<CheckoutFlowResult> {
  if (input.plan === "FREE") {
    if (!allowDevelopmentMocks) {
      throw new ExternalServiceError(
        "Downgrading to the Free plan must be managed through the Stripe billing portal.",
      );
    }

    return runMockCheckout(input);
  }

  const stripe = getStripeClient();
  const stripePriceId = getStripePriceId(input.plan === "PREMIUM_REVIEW" ? "PREMIUM_REVIEW" : "PRO");

  if (!stripe || !isStripeConfigured() || !stripePriceId) {
    return runMockCheckout(input);
  }

  const { customerId } = await ensureStripeCustomer(stripe, input.snapshot);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: input.snapshot.user.id,
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        userId: input.snapshot.user.id,
        plan: input.plan,
      },
    },
  });

  await createBillingSessionRecord({
    userId: input.snapshot.user.id,
    subscriptionId: input.snapshot.subscription?.id ?? null,
    provider: "STRIPE",
    type: "CHECKOUT",
    status: "OPEN",
    plan: input.plan,
    externalId: session.id,
    externalCustomerId: customerId,
    url: session.url,
    metadata: {
      stripePriceId,
    },
  });

  await updateSubscriptionRecord({
    userId: input.snapshot.user.id,
    plan: input.plan,
    provider: "STRIPE",
    status: "INCOMPLETE",
    stripeCustomerId: customerId,
    stripePriceId,
    stripeSubscriptionId: input.snapshot.subscription?.stripeSubscriptionId ?? null,
    currentPeriodEnd: input.snapshot.subscription?.currentPeriodEnd
      ? new Date(input.snapshot.subscription.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: input.snapshot.subscription?.cancelAtPeriodEnd ?? false,
  });

  return {
    mode: "stripe",
    redirectUrl: session.url ?? input.cancelUrl,
  };
}

export async function createPortalFlow(input: PortalFlowInput): Promise<CheckoutFlowResult> {
  const stripe = getStripeClient();

  if (
    !stripe ||
    !isStripeConfigured() ||
    !input.snapshot.subscription?.stripeCustomerId
  ) {
    if (!allowDevelopmentMocks) {
      throw new ExternalServiceError("Stripe billing portal is not configured for this environment.");
    }

    await createBillingSessionRecord({
      userId: input.snapshot.user.id,
      subscriptionId: input.snapshot.subscription?.id ?? null,
      provider: "MOCK",
      type: "PORTAL",
      status: "COMPLETED",
      plan: input.snapshot.subscription?.plan ?? "FREE",
      url: input.returnUrl,
      metadata: {
        fallback: true,
      },
    });

    return {
      mode: "mock",
      redirectUrl: withQueryValue(input.returnUrl, "portal", "mock"),
    };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: input.snapshot.subscription.stripeCustomerId,
    return_url: input.returnUrl,
  });

  await createBillingSessionRecord({
    userId: input.snapshot.user.id,
    subscriptionId: input.snapshot.subscription?.id ?? null,
    provider: "STRIPE",
    type: "PORTAL",
    status: "OPEN",
    plan: input.snapshot.subscription?.plan ?? "FREE",
    externalId: session.id,
    externalCustomerId: input.snapshot.subscription.stripeCustomerId,
    url: session.url,
  });

  return {
    mode: "stripe",
    redirectUrl: session.url,
  };
}

function stripeStatusToSubscriptionStatus(status: string) {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    case "incomplete":
      return "INCOMPLETE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}

function planFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (priceId && priceId === process.env.STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY) {
    return "PREMIUM_REVIEW";
  }

  return "PRO";
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (!isDatabaseConfigured) {
    if (!allowDevelopmentMocks) {
      throw new ExternalServiceError("Database is required to process Stripe webhooks.");
    }

    return;
  }

  logEvent("info", "Processing Stripe webhook event.", {
    type: event.type,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = (session.metadata?.plan as SubscriptionPlan | undefined) ?? "PRO";

    if (!userId) {
      return;
    }

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    await updateSubscriptionRecord({
      userId,
      plan,
      provider: "STRIPE",
      status: "ACTIVE",
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      stripePriceId: getStripePriceId(plan === "PREMIUM_REVIEW" ? "PREMIUM_REVIEW" : "PRO"),
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      cancelAtPeriodEnd: false,
    });

    await prisma.billingSession.updateMany({
      where: { externalId: session.id },
      data: {
        status: "COMPLETED",
      },
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;

    if (!userId) {
      return;
    }

    const primaryItem = subscription.items.data[0];
    const priceId = primaryItem?.price?.id ?? null;
    const plan = planFromPriceId(priceId);
    const currentPeriodEnd = primaryItem?.current_period_end
      ? new Date(primaryItem.current_period_end * 1000)
      : null;

    await updateSubscriptionRecord({
      userId,
      plan,
      provider: "STRIPE",
      status: stripeStatusToSubscriptionStatus(subscription.status),
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeProductId:
        typeof primaryItem?.price?.product === "string"
          ? primaryItem.price.product
          : null,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

    if (!customerId) {
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeCustomerId: customerId,
      },
    });

    if (!subscription) {
      return;
    }

    await createPaymentRecord({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: invoice.amount_paid || invoice.amount_due || 0,
      provider: "STRIPE",
      status: event.type === "invoice.paid" ? "PAID" : "FAILED",
      externalId: invoice.id,
      stripeInvoiceId: invoice.id,
      metadata: {
        billingReason: invoice.billing_reason,
      },
    });
  }
}
