"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { startCheckoutAction, openBillingPortalAction } from "@/lib/actions/billing";
import type { SubscriptionPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BillingActionButton({
  mode,
  plan,
  children,
  pendingLabel = "Processing...",
  className,
  variant = "primary",
  size = "md",
  errorClassName,
}: {
  mode: "checkout" | "portal";
  plan?: SubscriptionPlan;
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  errorClassName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);

    startTransition(async () => {
      if (mode === "checkout") {
        if (!plan) {
          setError("Missing plan selection.");
          return;
        }

        const formData = new FormData();
        formData.set("plan", plan);
        const result = await startCheckoutAction(formData);

        if (result.success) {
          router.push(result.redirectTo);
          router.refresh();
          return;
        }

        setError(result.error);
        return;
      }

      const result = await openBillingPortalAction();

      if (result.success) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }

      setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={pending}
        onClick={handleClick}
        size={size}
        type="button"
        variant={variant}
      >
        {pending ? pendingLabel : children}
      </Button>
      {error ? (
        <p className={cn("text-sm text-rose-700", errorClassName)}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
