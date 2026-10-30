"use client";

import { useEffect, useState } from "react";
import CalendarView, { Appointment } from "@/components/calendar/CalendarView";
import AppointmentModal from "@/components/calendar/AppointmentModal";
import StatsCard from "@/components/bento/StatCard";
import Card from "@/components/bento/Card";
import { Calendar, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";
import { compareCitaSchedule } from "@/components/calendar/cita-utils";

export default function CitasPage() {
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [estado, setEstado] = useState("Todos");
  const [error, setError] = useState("");

  const loadCitas = () => { setError(""); return fetch("/api/citas").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudieron cargar las citas"); setCitas(result.data || []); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las citas")); };
  useEffect(() => { loadCitas(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = [...(estado === "Todos" ? citas : citas.filter((cita) => cita.estado === estado))].sort(compareCitaSchedule);
  const citasHoy = citas.filter((cita) => cita.fecha === today).length;
  const confirmadas = citas.filter((cita) => cita.estado === "confirmada").length;
  const nuevas = citas.filter((cita) => cita.estado === "pendiente").length;
  const getName = (cita: Appointment) => cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellido}` : "Cliente sin nombre";

  return <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-4"><div><h1 className="font-display text-3xl font-bold text-brand-green">Citas</h1><p className="text-brand-text-light mt-1">Gestiona tus citas y agenda</p></div><AppointmentModal onCreated={loadCitas} /></div>
    {error && <div className="bento-card text-sm text-red-500">{error}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatsCard icon={Calendar} label="Citas Hoy" value={citasHoy} /><StatsCard icon={Clock} label="Confirmadas" value={confirmadas} /><StatsCard icon={UserPlus} label="Pendientes" value={nuevas} /></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bento-card p-0 overflow-hidden"><CalendarView appointments={citas} onUpdated={loadCitas} /></div><div className="space-y-4"><Card title="Filtros"><select className="input-field text-sm" value={estado} onChange={(event) => setEstado(event.target.value)}><option value="Todos">Todos los estados</option><option value="pendiente">Pendientes</option><option value="confirmada">Confirmadas</option><option value="completada">Completadas</option><option value="cancelada">Canceladas</option></select></Card><Card title="Citas registradas"><div className="space-y-3">{filtered.length ? filtered.slice(0, 8).map((cita) => <div key={cita.id} className="p-3 rounded-xl bg-brand-cream"><div className="flex items-center gap-3"><div className="w-20 shrink-0 min-h-12 rounded-xl bg-brand-green/20 flex items-center justify-center text-brand-green font-bold text-xs">{formatTime(cita.hora_inicio)}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{getName(cita)}</p><p className="text-xs text-brand-text-light truncate">{cita.servicios?.nombre || "Servicio"} · {cita.fecha}</p></div><span className="text-[10px] text-brand-text-light">{cita.estado}</span></div>{cita.estado !== "completada" && cita.estado !== "cancelada" && <Link href={`/dashboard/caja?cita=${cita.id}`} className="mt-3 w-full btn-primary text-sm text-center block">Pagar cita</Link>}</div>) : <p className="text-sm text-brand-text-light">No hay citas registradas.</p>}</div></Card></div></div>
  </div>;
}
