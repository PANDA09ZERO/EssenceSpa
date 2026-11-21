"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarView, { Appointment } from "@/components/calendar/CalendarView";
import AppointmentModal from "@/components/calendar/AppointmentModal";
import StatsCard from "@/components/bento/StatCard";
import Card from "@/components/bento/Card";
import { Calendar, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";
import { citaClientName, compareCitaSchedule, citaServiceNames, estadoLabels, fullName } from "@/components/calendar/cita-utils";
import { buildWorkerColors, type WorkerRef } from "@/components/calendar/worker-colors";
import { peruDateKey, shiftDateKey, agendaDateLabel } from "@/lib/appointment-dates";
import { apiFetch } from "@/lib/api-fetch";

type DateFilter = "ayer" | "hoy" | "manana" | "todas" | "fecha";
const estadoBadge: Record<string, string> = { confirmada: "bg-emerald-50 text-emerald-800", pendiente: "bg-amber-50 text-amber-800", en_progreso: "bg-sky-50 text-sky-800", completada: "bg-stone-100 text-stone-600", cancelada: "bg-red-50 text-red-700" };
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
  const [team, setTeam] = useState<WorkerRef[]>([]);
  const loadCitas = () => {
    setError(""); setLoading(true);
    return apiFetch("/api/citas").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar las citas");
      setCitas(result.data || []);
    }).catch(e => setError(e instanceof Error ? e.message : "No se pudieron cargar las citas")).finally(() => setLoading(false));
  };
  useEffect(() => { void loadCitas(); }, []);
  // El orden de creación del equipo fija el color de cada trabajador.
  useEffect(() => {
    apiFetch("/api/empleados").then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      setTeam((result.data || []).map((item: WorkerRef) => ({ id: item.id, created_at: item.created_at })));
    }).catch(() => { /* sin equipo: se usan los colores de respaldo */ });
  }, []);
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
  const getName = (cita: Appointment) => citaClientName(cita);
  // El calendario muestra todo el mes (solo filtra por estado); la fecha elegida se resalta.
  // Colores calculados con todas las citas para que cada trabajador conserve el suyo.
  const workerColor = useMemo(() => buildWorkerColors(citas, team), [citas, team]);
  const monthAppointments = citas.filter(cita => estado === "Todos" || cita.estado === estado);
  const selectCalendarDate = (date: string) => {
    const relative: Record<string, DateFilter> = { [shiftDateKey(today, -1)]: "ayer", [today]: "hoy", [shiftDateKey(today, 1)]: "manana" };
    if (relative[date]) { setDateFilter(relative[date]); return; }
    setCustomDate(date); setDateFilter("fecha");
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-3xl font-medium sm:text-4xl">Agenda de citas</h1><p className="mt-2 text-sm text-brand-text-light">Revisa el día, filtra por estado y cobra cada atención.</p></div><AppointmentModal onCreated={loadCitas} /></div>
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
        <CalendarView appointments={monthAppointments} focusDate={selectedDate} onSelectDate={selectCalendarDate} colorFor={workerColor} onUpdated={loadCitas} />
      </div>
      <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1"><Card title="Citas del período"><p className="mb-4 text-sm font-semibold">{periodLabel}</p><div className="divide-y divide-stone-100">{filtered.length ? filtered.map(cita => { const payable = cita.estado !== "completada" && cita.estado !== "cancelada"; return <div key={cita.id} className="flex items-start gap-3 py-3 first:pt-0">
          <div className="w-[4.75rem] shrink-0 pt-0.5"><p className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatTime(cita.hora_inicio)}</p>{selectedDate === null && <p className="mt-0.5 text-[11px] leading-4 text-brand-text-light">{agendaDateLabel(cita.fecha, today)}</p>}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{getName(cita)}</p><p className="mt-0.5 text-xs leading-5 text-brand-text-light">{citaServiceNames(cita).join(", ") || "Servicio"}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: workerColor(cita.id_empleado).solid }} /><span className="truncate">{fullName(cita.empleados) || "Sin asignar"}</span></p><span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] ${estadoBadge[cita.estado] || "bg-stone-100 text-stone-600"}`}>{estadoLabels[cita.estado] || cita.estado}</span></div>
          {payable && <Link href={`/dashboard/caja?cita=${cita.id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-brand-green/25 px-3.5 text-xs font-semibold text-brand-green transition-colors hover:border-brand-green hover:bg-brand-green hover:text-white">Cobrar</Link>}
        </div>; }) : <p className="text-sm leading-6 text-brand-text-light">{loading ? "Cargando citas…" : error ? "No se pudieron cargar las citas. Reintenta la consulta." : selectedDate === "" ? "Selecciona una fecha." : "No hay citas que coincidan con la fecha y el estado elegidos."}</p>}</div></Card></div>
    </div>
  </div>;
}
