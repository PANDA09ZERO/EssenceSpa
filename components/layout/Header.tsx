"use client";

import { useState } from "react";
import { useSupabase } from "@/components/layout/SupabaseProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Layers,
  UserCog,
  Tags,
  Calculator,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/citas", icon: Calendar, label: "Citas" },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes" },
  { href: "/dashboard/servicios", icon: Sparkles, label: "Servicios" },
  { href: "/dashboard/categorias", icon: Layers, label: "Categorías" },
  { href: "/dashboard/empleados", icon: UserCog, label: "Empleados" },
  { href: "/dashboard/promociones", icon: Tags, label: "Promociones" },
  { href: "/dashboard/caja", icon: Calculator, label: "Caja" },
  { href: "/dashboard/reportes", icon: FileText, label: "Reportes" },
];

export default function Header() {
  const { user, signOut } = useSupabase();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userName = user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    recepcionista: "Recepción",
    manicurista: "Especialista",
    empleado: "Equipo",
    cliente: "Cliente",
  };
  const userRole = user ? roleLabels[user.role] || user.role : "";

  const isActiveRoute = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <header className="bg-white border-b border-brand-cream-dark sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
            <i className="fas fa-spa text-white text-lg" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-brand-green text-lg">Essence Spa</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-xl p-2 text-brand-green transition-colors hover:bg-brand-cream"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="header-profile flex min-w-0 items-center gap-2 rounded-full border border-brand-green/10 bg-brand-cream/60 p-1.5 sm:gap-3 sm:pr-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green font-display text-sm font-bold uppercase text-white ring-2 ring-white">
              {userName.charAt(0)}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-36 truncate text-sm font-semibold leading-tight text-brand-text">{userName}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-brand-text-light">{userRole}</p>
            </div>
            <button onClick={signOut} className="rounded-full p-2 text-brand-text-light transition-colors hover:bg-red-50 hover:text-red-600" title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <nav className="hidden lg:flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`header-nav-link group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive ? "header-nav-active bg-brand-green text-white shadow-bento" : "text-brand-text hover:-translate-y-0.5 hover:bg-brand-cream"
              }`}
            >
              <item.icon size={18} />
              {item.label}
              <span aria-hidden="true" className={`header-nav-indicator absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-brand-gold transition-transform duration-200 ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
            </Link>
          );
        })}
      </nav>

      {mobileMenuOpen && (
        <nav aria-label="Navegación principal" className="header-mobile-menu lg:hidden border-t border-brand-cream-dark pb-4 px-2">
          <div className="grid grid-cols-3 gap-1">
            {navItems.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`header-nav-link flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-xs font-medium transition-all duration-200 ${
                    isActive ? "header-nav-active bg-brand-green text-white" : "text-brand-text hover:bg-brand-cream"
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
            <button onClick={signOut} className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-50">
              <LogOut size={20} /> Salir
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
