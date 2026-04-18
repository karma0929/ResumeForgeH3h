"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  variant = "primary",
  size = "md",
  className,
  ...props
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={className}
      disabled={pending || props.disabled}
      variant={variant}
      size={size}
      type="submit"
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
