import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  href?: string;
}

export default function StatCard({ icon: Icon, label, value, color = "text-brand-green", href }: StatCardProps) {
  const content = (
    <div className="bento-card cursor-pointer hover:shadow-bento-hover transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-brand-green/10 ${color}`}>
        <Icon size={24} />
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-sm text-brand-text-light">{label}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
