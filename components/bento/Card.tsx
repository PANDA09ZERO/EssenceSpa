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
      {title && <h3 className="font-display text-lg font-bold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
