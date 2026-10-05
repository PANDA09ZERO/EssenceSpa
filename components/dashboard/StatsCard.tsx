import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

export default function StatsCard({ icon: Icon, label, value, color }: Props) {
  return (
    <div className="bento-card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={24} />
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-sm text-brand-text-light">{label}</p>
    </div>
  );
}
