"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delayMs = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setVisible(false);
        }
      },
      {
        root: null,
        threshold: 0.14,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={cn("rf-reveal", className)}
      data-visible={visible ? "true" : "false"}
      style={{ transitionDelay: `${Math.max(0, delayMs)}ms` }}
    >
      {children}
    </div>
  );
}
