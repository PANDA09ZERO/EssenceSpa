"use client";

import { useEffect, useState } from "react";
import CalendarView, { Appointment } from "@/components/calendar/CalendarView";
import AppointmentModal from "@/components/calendar/AppointmentModal";
import StatsCard from "@/components/bento/StatCard";
import Card from "@/components/bento/Card";
import { Calendar, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";
import { compareCitaSchedule, citaServiceNames, estadoLabels } from "@/components/calendar/cita-utils";
import { peruDateKey, shiftDateKey, agendaDateLabel } from "@/lib/appointment-dates";

type DateFilter = "ayer" | "hoy" | "manana" | "todas" | "fecha";
const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "ayer", label: "Ayer" }, { value: "hoy", label: "Hoy" },
  { value: "manana", label: "Mañana" }, { value: "todas", label: "Todas las fechas" },
  { value: "fecha", label: "Elegir fecha" },
];

export default function CitasPage() {
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [estado, setEstado] = useState("Todos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [customDate, setCustomDate] = useState("");
  const [today, setToday] = useState(() => peruDateKey());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const loadCitas = () => {
    setError(""); setLoading(true);
    return fetch("/api/citas").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar las citas");
      setCitas(result.data || []);
    }).catch(e => setError(e instanceof Error ? e.message : "No se pudieron cargar las citas")).finally(() => setLoading(false));
  };
  useEffect(() => { void loadCitas(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(peruDateKey()), 60000);
    const update = () => setToday(peruDateKey());
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const selectedDate = dateFilter === "todas" ? null : dateFilter === "fecha" ? customDate : shiftDateKey(today, dateFilter === "ayer" ? -1 : dateFilter === "manana" ? 1 : 0);
  const dayAppointments = citas.filter(cita => selectedDate === null || cita.fecha === selectedDate);
  const filtered = dayAppointments.filter(cita => estado === "Todos" || cita.estado === estado).sort(compareCitaSchedule);
  const periodLabel = selectedDate === null ? "Todas las fechas" : selectedDate ? agendaDateLabel(selectedDate, today) : "Elige una fecha para consultar";
  const getName = (cita: Appointment) => cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellido}` : "Cliente sin nombre";

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-3xl font-bold text-brand-green">Citas</h1><p className="mt-1 text-brand-text-light">Gestiona tus citas y agenda</p></div><AppointmentModal onCreated={loadCitas} /></div>
    {error && <div role="alert" className="bento-card text-sm text-red-600">{error}<button type="button" onClick={() => void loadCitas()} disabled={loading} className="ml-3 min-h-11 underline disabled:opacity-50">Reintentar</button></div>}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><StatsCard icon={Calendar} label="Citas de hoy" value={citas.filter(cita => cita.fecha === today).length} /><StatsCard icon={Clock} label="Confirmadas del período" value={dayAppointments.filter(cita => cita.estado === "confirmada").length} /><StatsCard icon={UserPlus} label="Pendientes del período" value={dayAppointments.filter(cita => cita.estado === "pendiente").length} /></div>
    <section aria-label="Filtros de citas" className="bento-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar citas por fecha" className="flex flex-wrap gap-1.5">
          {dateFilters.map(item => <button key={item.value} type="button" aria-pressed={dateFilter === item.value} onClick={() => { setDateFilter(item.value); if (item.value === "fecha" && !customDate) setCustomDate(today); }} className={`min-h-9 rounded-full border px-3 py-1 text-xs transition-colors ${dateFilter === item.value ? "border-brand-green bg-brand-green text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{item.label}</button>)}
        </div>
        <label htmlFor="appointment-state-filter" className="sr-only">Estado de la cita</label>
        <select id="appointment-state-filter" aria-label="Estado de la cita" className="min-h-9 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green" value={estado} onChange={event => setEstado(event.target.value)}><option value="Todos">Todos los estados</option><option value="pendiente">Pendientes</option><option value="confirmada">Confirmadas</option><option value="en_progreso">En curso</option><option value="completada">Completadas</option><option value="cancelada">Canceladas</option></select>
        {dateFilter === "fecha" && <><label htmlFor="appointment-date-filter" className="sr-only">Fecha de la cita</label><input id="appointment-date-filter" aria-label="Fecha de la cita" type="date" className="min-h-9 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green" value={customDate} onChange={event => setCustomDate(event.target.value)} /></>}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <p role="status" aria-live="polite"><strong>{periodLabel}</strong><span className="text-stone-500"> · {loading ? "Cargando…" : `${filtered.length} ${filtered.length === 1 ? "cita" : "citas"}`}{estado !== "Todos" ? ` · ${estadoLabels[estado] || estado}` : ""}</span></p>
      </div>
    </section>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="bento-card overflow-hidden p-0 lg:col-span-2 lg:col-start-1 lg:row-start-1">
        <CalendarView appointments={filtered} focusDate={selectedDate} onUpdated={loadCitas} />
      </div>
      <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1"><Card title="Citas del período"><p className="mb-4 text-sm font-semibold">{periodLabel}</p><div className="space-y-3">{filtered.length ? filtered.map(cita => <div key={cita.id} className="rounded-xl bg-brand-cream p-3"><p className="mb-2 text-xs font-medium text-brand-text-light">{agendaDateLabel(cita.fecha, today)}</p><div className="flex items-center gap-3"><div className="flex min-h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-xs font-bold text-brand-green">{formatTime(cita.hora_inicio)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{getName(cita)}</p><p className="mt-1 text-xs text-brand-text-light">{citaServiceNames(cita).join(", ") || "Servicio"}</p><span className="mt-1 block text-xs text-brand-text-light">{estadoLabels[cita.estado] || cita.estado}</span></div></div>{cita.estado !== "completada" && cita.estado !== "cancelada" && <Link href={`/dashboard/caja?cita=${cita.id}`} className="btn-primary mt-3 block w-full text-center text-sm">Pagar cita</Link>}</div>) : <p className="text-sm leading-6 text-brand-text-light">{loading ? "Cargando citas…" : error ? "No se pudieron cargar las citas. Reintenta la consulta." : selectedDate === "" ? "Selecciona una fecha." : "No hay citas que coincidan con la fecha y el estado elegidos."}</p>}</div></Card></div>
    </div>
  </div>;
}
