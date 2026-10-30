"use client";

import { formatTime } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Calendar, CalendarDays, Calculator, Check, Clock3, RefreshCw, Sparkles, Users, Wallet } from "lucide-react";
import Link from "next/link";

interface Cita { id: string; fecha: string; hora_inicio: string; total: number; estado: string; clientes: { nombre: string; apellido: string } | null; servicios: { nombre: string } | null; }
interface Servicio { id: string; nombre: string; categoria: string | null; precio: number; }
interface DashboardData { stats: { clientes: number; servicios: number; citasHoy: number; ingresosMes: number }; citas: Cita[]; servicios: Servicio[]; }
const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const dateFormat = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" });
const statusStyles: Record<string, string> = { confirmada: "bg-emerald-50 text-emerald-800", pendiente: "bg-amber-50 text-amber-800", completada: "bg-stone-100 text-stone-600", cancelada: "bg-red-50 text-red-700" };
const shortcuts = [
  { href: "/dashboard/citas", icon: CalendarDays, title: "Gestionar citas", detail: "Consulta y organiza tu agenda" },
  { href: "/dashboard/clientes", icon: Users, title: "Ver clientes", detail: "Contactos y atención personal" },
  { href: "/dashboard/caja", icon: Wallet, title: "Abrir caja", detail: "Cobros y movimientos del día" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard", { signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar el resumen");
      if (!signal?.aborted) { setData(result); setUpdatedAt(new Date()); }
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar el resumen");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const metrics = [
    { label: "Citas de hoy", value: data?.stats.citasHoy, detail: "Tu agenda para hoy", icon: Calendar, href: "/dashboard/citas", featured: true },
    { label: "Clientes", value: data?.stats.clientes, detail: "Personas registradas", icon: Users, href: "/dashboard/clientes" },
    { label: "Servicios activos", value: data?.stats.servicios, detail: "Disponibles en tu catálogo", icon: Sparkles, href: "/dashboard/servicios" },
    { label: "Ingresos del mes", value: data ? currency.format(data.stats.ingresosMes) : undefined, detail: "Ingresos registrados en caja", icon: Calculator, href: "/dashboard/caja" },
  ];
  const now = new Date();

  return <div className="space-y-7">
    <section className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-stone-500">Tu negocio, en equilibrio</p><h1 className="font-display text-3xl font-medium sm:text-4xl">Así va tu día</h1><p className="mt-3 text-sm text-stone-600">Agenda, clientes y resultados de Essence Spa en un solo lugar.</p></div>
      <div className="flex flex-wrap items-center gap-3"><p className="mr-1 flex items-center gap-2 text-xs text-stone-500"><CalendarDays size={15} />{dateFormat.format(now)}</p><button type="button" onClick={() => void load()} disabled={loading} className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white transition-colors hover:bg-stone-100 disabled:opacity-50" aria-label="Actualizar resumen"><RefreshCw size={17} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /></button><Link href="/dashboard/citas" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-medium text-white">Ver agenda <ArrowUpRight size={16} /></Link></div>
    </section>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}{data ? " Se muestran los últimos datos cargados." : ""}</p><button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 rounded-full border border-red-300 px-4 font-medium disabled:opacity-50">Reintentar</button></div>}
    <section aria-label="Indicadores del negocio" aria-busy={loading} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map(item => <Link key={item.label} href={item.href} className={`group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.featured ? "border-stone-800 bg-brand-green text-white" : "border-stone-200 bg-white"}`}><div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.featured ? "bg-white/10" : "bg-[#F5F3EE]"}`}><item.icon size={20} strokeWidth={1.5} /></span><ArrowUpRight size={16} className={item.featured ? "text-white/50" : "text-stone-400"} /></div><p className={`mt-5 text-xs ${item.featured ? "text-white/75" : "text-stone-600"}`}>{item.label}</p><p className="mt-1 break-words text-3xl font-semibold tracking-tight">{item.value ?? (loading ? "…" : "—")}</p><p className={`mt-3 text-[11px] ${item.featured ? "text-white/60" : "text-stone-500"}`}>{item.detail}</p></Link>)}
    </section>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5 sm:p-6"><div><h2 className="font-display text-xl">Próximas citas</h2><p className="mt-1 text-xs text-stone-500">Tus próximas atenciones, por fecha y hora.</p></div><Link href="/dashboard/citas" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold">Ver agenda <ArrowRight size={15} /></Link></div>
        {loading && !data ? <p role="status" className="p-8 text-sm text-stone-500">Cargando tu agenda…</p> : data?.citas.length ? <ul className="divide-y divide-stone-100">{data.citas.map(cita => { const name = cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellido}` : "Cliente sin nombre"; return <li key={cita.id} className="flex flex-wrap items-center gap-3 p-5 sm:px-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEE9E0] text-xs font-semibold">{name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0,2)}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-stone-500">{cita.servicios?.nombre || "Servicio"}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-stone-600"><Clock3 size={12} />{cita.fecha.split("-").reverse().join("/")} · {formatTime(cita.hora_inicio)}</p></div><span className={`rounded-full px-3 py-1.5 text-[11px] capitalize ${statusStyles[cita.estado] || "bg-stone-100 text-stone-600"}`}>{cita.estado}</span></li>; })}</ul> : <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F3EE]"><CalendarDays size={24} strokeWidth={1.3} /></span><h3 className="font-display text-xl">{error ? "Agenda no disponible" : "Un espacio en tu agenda"}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-stone-500">{error ? "Reintenta la carga para consultar tus citas." : "Todavía no hay próximas citas. Organiza la siguiente atención desde tu agenda."}</p><Link href="/dashboard/citas" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 px-5 text-xs font-semibold">Ir a citas <ArrowRight size={14} /></Link></div>}
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><p className="mb-4 text-[10px] font-semibold uppercase tracking-[.16em] text-stone-500">A un paso</p><div className="divide-y divide-stone-100">{shortcuts.map(item => <Link key={item.href} href={item.href} className="group flex items-center gap-3 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F3EE]"><item.icon size={18} strokeWidth={1.5} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-stone-500">{item.detail}</p></div><ArrowUpRight size={16} className="shrink-0 text-stone-400 transition-transform group-hover:-translate-y-0.5" /></Link>)}</div></section><section className="rounded-2xl bg-[#EAE4D9] p-6"><Sparkles size={22} strokeWidth={1.4} /><h2 className="mt-4 font-display text-2xl">Cuidar cada detalle.</h2><p className="mt-2 text-sm leading-6 text-stone-600">Mantén tus servicios y precios al día para que cada visita empiece con claridad.</p><Link href="/dashboard/servicios" className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold">Gestionar catálogo <ArrowRight size={15} /></Link></section></aside>
    </div>
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl">Tu carta de servicios</h2><p className="mt-1 text-xs text-stone-500">Una muestra de tus servicios activos.</p></div><Link href="/dashboard/servicios" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold">Ver todos <ArrowRight size={15} /></Link></div><div className="grid gap-3 md:grid-cols-3">{data?.servicios.map(service => <Link href="/dashboard/servicios" key={service.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 transition-colors hover:bg-stone-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F3EE]"><Sparkles size={17} strokeWidth={1.3} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{service.nombre}</p><p className="mt-1 text-xs text-stone-500">{service.categoria || "Servicio"}</p></div><span className="text-xs font-semibold">{currency.format(Number(service.precio))}</span></Link>)}</div>{!data?.servicios.length && <p className="text-sm text-stone-500">{loading ? "Cargando servicios…" : error ? "No pudimos consultar los servicios." : "No hay servicios activos."}</p>}</section>
    {updatedAt && <p role="status" className="flex items-center justify-end gap-1.5 text-[11px] text-stone-500"><Check size={13} />Actualizado a las {updatedAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}</p>}
  </div>;
}
