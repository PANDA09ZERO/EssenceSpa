import { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className, title }: CardProps) {
  return (
    <div className={clsx("bento-card", className || "")}>
      {title && <h2 className="mb-4 font-display text-xl font-medium">{title}</h2>}
      {children}
    </div>
  );
}
