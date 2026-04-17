import { logEvent } from "@/lib/logger";

export type AnalyticsEventName =
  | "auth_login_success"
  | "auth_signup_success"
  | "billing_checkout_started"
  | "billing_portal_opened"
  | "analysis_run"
  | "rewrite_run"
  | "tailored_draft_run"
  | "tailored_version_saved"
  | "settings_updated";

export function trackEvent(
  event: AnalyticsEventName,
  properties: Record<string, unknown> = {},
) {
  // TODO: replace with Segment/PostHog/Amplitude adapter in production analytics stack.
  logEvent("info", "Analytics event", {
    event,
    ...properties,
  });
}
