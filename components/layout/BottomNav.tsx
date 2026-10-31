"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/layout/SupabaseProvider";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Calculator,
} from "lucide-react";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/citas", icon: Calendar, label: "Citas" },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes" },
  { href: "/dashboard/servicios", icon: Sparkles, label: "Servicios" },
  { href: "/dashboard/caja", icon: Calculator, label: "Caja" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useSupabase();
  const canManageCaja = user?.role === "admin" || user?.role === "recepcionista";
  const visibleItems = items.filter(item => item.href !== "/dashboard/caja" || canManageCaja);

  return (
    <nav aria-label="Accesos principales" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2 px-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${isActive ? "bg-stone-100 text-stone-950" : "text-stone-500 hover:bg-stone-50"}`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
