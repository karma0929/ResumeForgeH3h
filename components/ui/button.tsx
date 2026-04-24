import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-cyan-400/45 bg-gradient-to-r from-sky-500/85 to-blue-600/85 text-white hover:from-sky-500 hover:to-blue-500 shadow-[0_12px_30px_-18px_rgba(14,165,233,0.85)]",
  secondary:
    "border border-slate-500/45 bg-slate-900/70 text-slate-100 hover:border-sky-400/55 hover:bg-slate-800/80",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-900/80 hover:text-slate-100",
  outline: "border border-slate-500/50 bg-slate-900/65 text-slate-100 hover:border-slate-300/65 hover:bg-slate-800/80",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
