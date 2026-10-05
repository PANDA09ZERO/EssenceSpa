"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Calculator, Clock, DollarSign, Sparkles, Users } from "lucide-react";
import Link from "next/link";

interface Cita { id: string; fecha: string; hora_inicio: string; total: number; estado: string; clientes: { nombre: string; apellido: string } | null; servicios: { nombre: string } | null; }
interface Servicio { id: string; nombre: string; categoria: string | null; icono: string | null; precio: number; }
interface DashboardData { stats: { clientes: number; servicios: number; citasHoy: number; ingresosMes: number }; citas: Cita[]; servicios: Servicio[]; }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard"));
  }, []);

  const stats = data?.stats || { clientes: 0, servicios: 0, citasHoy: 0, ingresosMes: 0 };
  const formatDate = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-3xl font-bold text-brand-green">Dashboard</h1><p className="text-brand-text-light mt-1">Resumen real de Essence Spa</p></div><div className="text-right"><p className="text-sm text-brand-text-light">Hoy</p><p className="font-display text-lg font-semibold text-brand-text">{formatDate.format(new Date())}</p></div></div>
    {error && <div className="bento-card text-sm text-red-500">{error}</div>}

    <div className="bento-grid-masonry">
      <Link href="/dashboard/citas" className="bento-card bento-item-1x1 bg-gradient-to-br from-brand-green to-brand-green-dark text-white"><Calendar size={24} /><p className="font-display text-3xl font-bold mt-4">{stats.citasHoy}</p><p className="text-white/80 text-sm">Citas Hoy</p></Link>
      <Link href="/dashboard/clientes" className="bento-card bento-item-1x1"><Users className="text-brand-green" size={24} /><p className="font-display text-3xl font-bold text-brand-green mt-4">{stats.clientes}</p><p className="text-brand-text-light text-sm">Clientes Registrados</p></Link>
      <Link href="/dashboard/servicios" className="bento-card bento-item-1x1"><Sparkles className="text-brand-gold" size={24} /><p className="font-display text-3xl font-bold text-brand-gold mt-4">{stats.servicios}</p><p className="text-brand-text-light text-sm">Servicios Activos</p></Link>
      <Link href="/dashboard/caja" className="bento-card bento-item-1x1"><Calculator className="text-brand-green" size={24} /><p className="font-display text-3xl font-bold text-brand-green mt-4">S/ {stats.ingresosMes.toFixed(2)}</p><p className="text-brand-text-light text-sm">Ingresos del Mes</p></Link>

      <div className="bento-card bento-item-2x1 md:col-span-2"><div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-bold">Citas Próximas</h3><Link href="/dashboard/citas" className="text-sm text-brand-green flex items-center gap-1">Ver todas <ArrowRight size={16} /></Link></div><div className="space-y-3">{data?.citas.length ? data.citas.map((cita) => { const nombre = cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellido}` : "Cliente sin nombre"; return <div key={cita.id} className="flex items-center gap-4 p-3 rounded-xl bg-brand-cream"><div className="w-12 h-12 rounded-xl bg-brand-green text-white flex items-center justify-center font-bold text-sm">{nombre.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div className="flex-1"><p className="font-medium">{nombre}</p><p className="text-sm text-brand-text-light">{cita.servicios?.nombre || "Servicio"} · {cita.fecha}</p></div><div className="text-right"><p className="font-bold text-brand-green">{cita.hora_inicio}</p><p className="text-xs text-brand-text-light">{cita.estado}</p></div></div>; }) : <p className="text-sm text-brand-text-light">No hay citas registradas.</p>}</div></div>

      <div className="bento-card bento-item-1x1"><div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-bold">Tiempo</h3><Clock className="text-brand-green" size={20} /></div><p className="text-sm text-brand-text-light">Consulta la duración de cada servicio en el catálogo.</p><Link href="/dashboard/servicios" className="text-sm text-brand-green inline-flex items-center gap-1 mt-4">Ver servicios <ArrowRight size={16} /></Link></div>

      <div className="bento-card bento-item-2x1 md:col-span-2"><div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-bold">Servicios Registrados</h3><Link href="/dashboard/servicios" className="text-sm text-brand-green flex items-center gap-1">Ver todos <ArrowRight size={16} /></Link></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{data?.servicios.length ? data.servicios.map((servicio) => <div key={servicio.id} className="text-center p-4 rounded-xl bg-brand-cream"><div className="text-3xl mb-2">{servicio.icono || "✨"}</div><p className="font-medium text-sm">{servicio.nombre}</p><p className="text-xs text-brand-text-light">S/ {Number(servicio.precio).toFixed(2)}</p></div>) : <p className="text-sm text-brand-text-light">No hay servicios registrados.</p>}</div></div>

      <div className="bento-card bento-item-1x1"><div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-bold">Caja</h3><DollarSign className="text-brand-green" size={20} /></div><p className="text-sm text-brand-text-light">Los cobros de citas aparecen automáticamente como ingresos.</p><Link href="/dashboard/caja" className="text-sm text-brand-green inline-flex items-center gap-1 mt-4">Abrir caja <ArrowRight size={16} /></Link></div>
    </div>
  </div>;
}
