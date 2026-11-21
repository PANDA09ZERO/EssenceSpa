import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  href?: string;
}

export default function StatCard({ icon: Icon, label, value, color = "text-brand-green", href }: StatCardProps) {
  const content = (
    <div className={clsx("bento-card flex h-full flex-col", href && "transition-shadow hover:shadow-bento-hover")}>
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3EE] ${color}`}>
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <p className="text-xs text-stone-600">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
