"use client";

import { useState } from "react";
import { useSupabase } from "@/components/layout/SupabaseProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Calendar, Users, Sparkles, Layers, UserCog, Tags, Calculator, FileText, LogOut, Menu, X, ArrowUpRight } from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Resumen" },
  { href: "/dashboard/citas", icon: Calendar, label: "Agenda de citas" },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes" },
  { href: "/dashboard/servicios", icon: Sparkles, label: "Servicios" },
  { href: "/dashboard/categorias", icon: Layers, label: "Categorías" },
  { href: "/dashboard/empleados", icon: UserCog, label: "Equipo" },
  { href: "/dashboard/promociones", icon: Tags, label: "Promociones" },
  { href: "/dashboard/caja", icon: Calculator, label: "Caja y cobros" },
  { href: "/dashboard/reportes", icon: FileText, label: "Reportes" },
];

export default function Header() {
  const { user, signOut } = useSupabase();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userName = user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";
  const roleLabels: Record<string, string> = { admin: "Administrador", recepcionista: "Recepción", manicurista: "Especialista", empleado: "Equipo", cliente: "Cliente" };
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const current = navItems.find(item => isActive(item.href))?.label || "Panel de control";
  const canManageCaja = user?.role === "admin" || user?.role === "recepcionista";
  const visibleNavItems = navItems.filter(item => item.href !== "/dashboard/caja" || canManageCaja);
  const links = visibleNavItems.map((item) => <div key={item.href}>
    {item.href === "/dashboard" && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-stone-500">Tu espacio de trabajo</p>}
    {item.href === "/dashboard/caja" && <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-stone-500">Administración</p>}
    <Link href={item.href} onClick={() => setMobileMenuOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive(item.href) ? "bg-brand-green text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`}><item.icon size={18} strokeWidth={1.6} />{item.label}</Link>
  </div>);

  return <>
    <aside aria-label="Barra lateral" className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-stone-200 bg-[#FCFBF8] lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-6 py-8"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-white"><Sparkles size={20} strokeWidth={1.3} /></span><span><span className="block font-display text-xl">Essence Spa</span><span className="text-[10px] uppercase tracking-[.2em] text-stone-500">Panel de gestión</span></span></Link>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-4 py-3">{links}</nav>
      <div className="m-4 rounded-2xl border border-stone-200 bg-white p-4"><p className="font-display text-lg">Tu vitrina digital</p><p className="mt-1 text-xs leading-5 text-stone-500">Así ven tus clientes los servicios de Essence.</p><Link href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold">Ver página pública <ArrowUpRight size={15} /></Link></div>
    </aside>
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FCFBF8]/95 backdrop-blur lg:ml-60">
      <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-controls="dashboard-mobile-nav" aria-expanded={mobileMenuOpen} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 lg:hidden">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button><div><p className="text-[10px] uppercase tracking-[.15em] text-stone-500">Essence / Gestión</p><p className="truncate text-sm font-medium">{current}</p></div></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-medium">{userName}</p><p className="text-xs text-stone-500">{user ? roleLabels[user.role] || user.role : "Cargando sesión…"}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e3d9] text-sm font-semibold uppercase">{userName.charAt(0)}</span><button type="button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"><LogOut size={18} /></button></div>
      </div>
      {mobileMenuOpen && <nav id="dashboard-mobile-nav" aria-label="Navegación principal móvil" className="max-h-[65vh] overflow-y-auto border-t border-stone-200 bg-[#FCFBF8] p-4 lg:hidden">{links}<Link href="/" className="block px-3 py-3 text-sm underline">Ver página pública</Link></nav>}
    </header>
  </>;
}
