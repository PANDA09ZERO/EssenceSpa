"use client";

import { useEffect, useState } from "react";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Phone, Scissors, Trash2, User, Users, UserPlus, UserRound, X } from "lucide-react";
import { formatTime } from "@/lib/utils";
import AppointmentEditModal from "./AppointmentEditModal";
import ConvertGuestModal from "./ConvertGuestModal";
import WorkerDayGrid from "./WorkerDayGrid";
import { apiFetch } from "@/lib/api-fetch";
import { peruDateKey, shiftDateKey } from "@/lib/appointment-dates";
import type { Appointment } from "./types";
import { citaClientName, citaDurationMinutes, citaServiceNames, estadoLabels, fullName, isGuestCita, statusBadges, statusColors, compareCitaSchedule } from "./cita-utils";

export type { Appointment };

interface Props {
  appointments: Appointment[];
  onUpdated?: () => void;
  /** Fecha elegida en la agenda (yyyy-MM-dd); null = todas las fechas. */
  focusDate?: string | null;
  /** Al tocar un día del mes se elige esa fecha en la agenda. */
  onSelectDate?: (date: string) => void;
}

// "9:00 a.m." → "9a" y "10:30 p.m." → "10:30p" para que entre en la celda del mes.
function shortTime(time: string) {
  return formatTime(time).replace(":00 ", " ").replace(" a.m.", "a").replace(" p.m.", "p");
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

export default function CalendarView({ appointments, onUpdated, focusDate, onSelectDate }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
  const [editingCita, setEditingCita] = useState<Appointment | null>(null);
  const [convertingCita, setConvertingCita] = useState<Appointment | null>(null);
  // La vista por trabajador es la principal; el mes sirve para saltar entre días.
  const [view, setView] = useState<"dia" | "mes">("dia");
  const [localDay, setLocalDay] = useState(() => peruDateKey());
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setConfirmDelete(false); setActionError(""); }, [selectedCitaId]);

  useEffect(() => {
    if (focusDate) setCurrentDate(new Date(`${focusDate}T12:00:00`));
  }, [focusDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const leadingDays = (startOfMonth(currentDate).getDay() + 6) % 7;
  const trailingDays = (7 - ((leadingDays + days.length) % 7)) % 7;
  const todayKey = peruDateKey();
  const selectedDate = focusDate || null;
  // Día que muestra la vista por trabajador: el de la agenda o, si se ven todas las fechas, hoy.
  const dayKey = onSelectDate ? (selectedDate || todayKey) : localDay;
  const chooseDay = (key: string) => { if (onSelectDate) onSelectDate(key); else setLocalDay(key); };
  const viewingCurrentMonth = format(currentDate, "yyyy-MM") === todayKey.slice(0, 7);
  const goToday = () => { setCurrentDate(new Date(`${todayKey}T12:00:00`)); chooseDay(todayKey); };
  const stepDay = (delta: number) => chooseDay(shiftDateKey(dayKey, delta));
  const stepMonth = (delta: number) => setCurrentDate(new Date(year, month + delta, 1));
  const appointmentsByDate = [...appointments].sort(compareCitaSchedule).reduce<Record<string, Appointment[]>>((result, appointment) => {
    (result[appointment.fecha] ||= []).push(appointment);
    return result;
  }, {});

  const dayCitas = appointmentsByDate[dayKey] || [];
  const workerCount = new Set(dayCitas.map((cita) => cita.id_empleado || "sin-asignar")).size;
  const detailCita = selectedCitaId ? appointments.find((cita) => cita.id === selectedCitaId) || null : null;

  const openCita = (citaId: string) => setSelectedCitaId(citaId);
  const closeDetail = () => setSelectedCitaId(null);
  // En el mes, tocar un día lo abre en la vista por trabajador.
  const openDayView = (key: string) => { chooseDay(key); setView("dia"); };

  const runCitaAction = async (cita: Appointment, options: RequestInit) => {
    setActionBusy(true);
    setActionError("");
    try {
      const response = await apiFetch(`/api/citas/${cita.id}`, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo completar la acción");
      setSelectedCitaId(null);
      setConfirmDelete(false);
      onUpdated?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setActionBusy(false);
    }
  };
  const cancelCita = (cita: Appointment) => runCitaAction(cita, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "cancelada" }),
  });
  const deleteCita = (cita: Appointment) => runCitaAction(cita, { method: "DELETE" });

  useEffect(() => {
    if (!selectedCitaId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingCita) setEditingCita(null);
      else setSelectedCitaId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCitaId, editingCita]);

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <div role="group" aria-label="Vista del calendario" className="mb-3 inline-flex rounded-full bg-[#F5F3EE] p-1">
              <button type="button" aria-pressed={view === "dia"} onClick={() => setView("dia")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors ${view === "dia" ? "bg-white text-brand-text shadow-sm" : "text-stone-500 hover:text-brand-text"}`}><Users size={14} /> Por trabajador</button>
              <button type="button" aria-pressed={view === "mes"} onClick={() => { setCurrentDate(new Date(`${dayKey}T12:00:00`)); setView("mes"); }} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors ${view === "mes" ? "bg-white text-brand-text shadow-sm" : "text-stone-500 hover:text-brand-text"}`}><CalendarDays size={14} /> Mes</button>
            </div>
            <h2 className="font-display text-2xl font-medium first-letter:uppercase">
              {view === "dia" ? format(new Date(`${dayKey}T12:00:00`), "EEEE d 'de' MMMM", { locale: es }) : format(currentDate, "MMMM yyyy", { locale: es })}
            </h2>
            {view === "dia" && <p className="mt-1 text-xs text-stone-500">{dayCitas.length ? `${dayCitas.length === 1 ? "1 cita" : `${dayCitas.length} citas`} · ${workerCount === 1 ? "1 trabajador" : `${workerCount} trabajadores`}` : "Sin citas"}</p>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={goToday} disabled={view === "dia" ? dayKey === todayKey : viewingCurrentMonth} className="mr-1 min-h-10 rounded-full border border-stone-200 px-4 text-xs font-semibold transition-colors hover:border-brand-green disabled:opacity-40 disabled:hover:border-stone-200">Hoy</button>
            <button type="button" onClick={() => (view === "dia" ? stepDay(-1) : stepMonth(-1))} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#F5F3EE]" aria-label={view === "dia" ? "Día anterior" : "Mes anterior"}><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => (view === "dia" ? stepDay(1) : stepMonth(1))} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#F5F3EE]" aria-label={view === "dia" ? "Día siguiente" : "Mes siguiente"}><ChevronRight size={20} /></button>
          </div>
        </div>
        {view === "dia" && (
          <div className="px-3 pb-5 sm:px-6">
            {dayCitas.length
              ? <WorkerDayGrid appointments={dayCitas} onSelect={(cita) => openCita(cita.id)} />
              : <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 px-6 py-10 text-center"><CalendarDays size={22} strokeWidth={1.4} className="text-stone-400" /><p className="mt-3 text-sm text-stone-600">No hay citas para este día.</p><button type="button" onClick={() => { setCurrentDate(new Date(`${dayKey}T12:00:00`)); setView("mes"); }} className="mt-3 min-h-10 text-xs font-semibold underline underline-offset-4">Buscar en el mes</button></div>}
          </div>
        )}
        {view === "mes" && <>
        <div className="grid grid-cols-7 border-t border-stone-100">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day} className="py-2 text-center text-xs font-medium text-stone-500">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px border-y border-stone-100 bg-stone-100">
          {Array.from({ length: leadingDays }, (_, index) => <div key={`lead-${index}`} className="min-h-14 bg-[#FAF9F6] sm:min-h-24" />)}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const apps = appointmentsByDate[key] || [];
            const active = apps.filter((app) => app.estado !== "cancelada");
            const isSelected = dayKey === key;
            const today = key === todayKey;
            const past = key < todayKey;
            const dayLabel = format(day, "EEEE d 'de' MMMM", { locale: es });
            return (
              <div key={key} className={`relative min-h-14 p-1.5 sm:min-h-24 sm:p-2 ${isSelected ? "bg-[#F5F3EE]" : "bg-white"}`}>
                <button
                  type="button"
                  onClick={() => openDayView(key)}
                  aria-pressed={isSelected}
                  aria-label={`${dayLabel}${apps.length ? `, ${apps.length === 1 ? "1 cita" : `${apps.length} citas`}` : ", sin citas"}`}
                  className={`absolute inset-0 transition-colors hover:bg-[#F5F3EE] ${isSelected ? "ring-2 ring-inset ring-brand-green" : ""}`}
                />
                <div className="pointer-events-none relative flex items-center justify-between gap-1">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums ${today ? "bg-brand-green font-semibold text-white" : past ? "text-stone-400" : "text-brand-text"}`}>{format(day, "d")}</span>
                  {active.length > 0 && <span className="hidden text-[11px] font-medium text-stone-500 sm:inline">{active.length}</span>}
                </div>
                {/* Móvil: puntos por estado */}
                <div className="pointer-events-none relative mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {apps.slice(0, 4).map((app) => <span key={app.id} className={`h-1.5 w-1.5 rounded-full ${statusColors[app.estado] || "bg-stone-400"}`} />)}
                </div>
                {/* Escritorio: primeras citas del día */}
                <div className="relative mt-1 hidden space-y-0.5 sm:block">
                  {apps.slice(0, 2).map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => openCita(app.id)}
                      title={`${formatTime(app.hora_inicio)} · ${citaClientName(app)} · ${citaServiceNames(app).join(", ")}`}
                      className={`flex w-full items-center gap-1 rounded-md px-0.5 py-0.5 text-left text-[11px] leading-4 transition-colors hover:bg-white ${app.estado === "cancelada" ? "text-stone-400 line-through" : "text-brand-text"}`}
                    >
                      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[app.estado] || "bg-stone-400"}`} />
                      <span className="shrink-0 tabular-nums text-stone-500">{shortTime(app.hora_inicio)}</span>
                      <span className="truncate">{firstName(citaClientName(app))}</span>
                    </button>
                  ))}
                  {apps.length > 2 && (
                    <button type="button" onClick={() => openDayView(key)} className="w-full rounded-md px-1 py-0.5 text-left text-[11px] font-medium text-stone-500 hover:bg-white hover:text-brand-text">+{apps.length - 2} más</button>
                  )}
                </div>
              </div>
            );
          })}
          {Array.from({ length: trailingDays }, (_, index) => <div key={`trail-${index}`} className="min-h-14 bg-[#FAF9F6] sm:min-h-24" />)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <ul aria-label="Estados de las citas" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {Object.entries(estadoLabels).map(([estado, label]) => <li key={estado} className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusColors[estado]}`} />{label}</li>)}
          </ul>
        </div>
        </>}
      </div>
      {detailCita && (
        <div className="fixed inset-0 bg-brand-green/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Detalle de la cita" onClick={closeDetail}>
          <div className={`bg-white rounded-3xl shadow-bento w-full max-w-2xl max-h-[92vh] overflow-y-auto`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-6">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-medium first-letter:uppercase">
                  Detalle de la cita
                </h2>
              </div>
              <button type="button" onClick={closeDetail} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#F5F3EE]" aria-label="Cerrar"><X size={20} /></button>
            </div>

            {detailCita && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold truncate">{citaClientName(detailCita)}</h3>
                    <p className="text-xs text-brand-text-light first-letter:uppercase">{format(new Date(`${detailCita.fecha}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
                    {isGuestCita(detailCita) && (
                      <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Invitado</span>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${statusBadges[detailCita.estado] || "bg-gray-100 text-gray-600"}`}>{estadoLabels[detailCita.estado] || detailCita.estado}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: User, label: "Cliente", value: citaClientName(detailCita) },
                    ...(isGuestCita(detailCita) && detailCita.telefono_invitado
                      ? [{ icon: Phone, label: "Teléfono", value: detailCita.telefono_invitado }]
                      : []),
                    { icon: Scissors, label: "Servicio", value: citaServiceNames(detailCita).join(", ") || "Sin servicio registrado" },
                    { icon: UserRound, label: "Trabajador", value: fullName(detailCita.empleados) || "Sin trabajador asignado" },
                    { icon: CalendarDays, label: "Fecha", value: format(new Date(`${detailCita.fecha}T12:00:00`), "d 'de' MMMM yyyy", { locale: es }) },
                    { icon: Clock, label: "Hora de inicio", value: formatTime(detailCita.hora_inicio) },
                    { icon: Clock, label: "Hora de finalización", value: detailCita.hora_fin ? `${formatTime(detailCita.hora_fin)} · ${citaDurationMinutes(detailCita)} min` : citaDurationMinutes(detailCita) > 0 ? `${citaDurationMinutes(detailCita)} min de duración` : "Por confirmar" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3 p-3 rounded-2xl bg-brand-cream">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-brand-green shrink-0"><row.icon size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-xs text-brand-text-light">{row.label}</p>
                        <p className="text-sm font-medium text-brand-text break-words">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="label-field">Observaciones</p>
                  <p className="text-sm text-brand-text bg-brand-cream rounded-xl p-3 whitespace-pre-wrap">{detailCita.notas?.trim() || "Sin observaciones."}</p>
                </div>

                {actionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{actionError}</p>}
                <div className="flex flex-col sm:flex-row gap-3">
                  {detailCita.estado !== "cancelada" && detailCita.estado !== "completada" && (
                    <button type="button" disabled={actionBusy} onClick={() => void cancelCita(detailCita)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"><Ban size={16} /> {actionBusy ? "Cancelando…" : "Cancelar cita"}</button>
                  )}
                  {detailCita.estado !== "completada" && detailCita.estado !== "en_progreso" && !confirmDelete && (
                    <button type="button" disabled={actionBusy} onClick={() => setConfirmDelete(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /> Eliminar cita</button>
                  )}
                  {confirmDelete && (
                    <div className="flex flex-1 flex-col gap-3 rounded-xl bg-red-50 p-3 sm:flex-row sm:items-center">
                      <p className="flex-1 text-sm text-red-700">¿Eliminar la cita del registro? No se puede deshacer.</p>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-text">Conservar</button>
                      <button type="button" disabled={actionBusy} onClick={() => void deleteCita(detailCita)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Sí, eliminar</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {isGuestCita(detailCita) && (
                    <button type="button" onClick={() => setConvertingCita(detailCita)} className="flex flex-[1.4] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green/10">
                      <UserPlus size={16} /> Registrar como cliente
                    </button>
                  )}
                  <button type="button" onClick={() => setEditingCita(detailCita)} className="btn-primary flex flex-1 items-center justify-center gap-2 whitespace-nowrap text-sm"><Pencil size={16} /> Editar cita</button>
                  <button type="button" onClick={closeDetail} className="flex-1 py-3 rounded-xl bg-brand-cream text-sm text-brand-text font-semibold hover:bg-brand-cream/80 transition-colors">Cerrar</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
      {editingCita && (
        <AppointmentEditModal
          cita={editingCita}
          onClose={() => setEditingCita(null)}
          onSaved={() => { setEditingCita(null); onUpdated?.(); }}
        />
      )}
      {convertingCita && (
        <ConvertGuestModal
          cita={convertingCita}
          onClose={() => setConvertingCita(null)}
          onConverted={() => { setConvertingCita(null); onUpdated?.(); }}
        />
      )}
    </>
  );
}
