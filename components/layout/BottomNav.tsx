"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Calculator,
  Menu,
  Plus,
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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-cream-dark z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith("/dashboard") && item.href === "/dashboard");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-bottom-item flex-1 justify-center ${isActive ? "active" : ""}`}
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
