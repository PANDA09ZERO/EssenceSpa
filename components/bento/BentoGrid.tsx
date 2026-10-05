import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

interface BentoGridProps {
  children: ReactNode;
  cols?: string;
  className?: string;
}

export default function BentoGrid({ children, cols = "grid gap-4", className }: BentoGridProps) {
  return (
    <div className={clsx("grid gap-4", cols, className || "")}>
      {children}
    </div>
  );
}
