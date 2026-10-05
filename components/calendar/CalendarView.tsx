"use client";

import { useEffect, useState } from "react";
import { eachDayOfInterval, endOfMonth, format, isToday, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Eye, Pencil, Scissors, User, UserRound, X } from "lucide-react";
import AppointmentEditModal from "./AppointmentEditModal";
import type { Appointment } from "./types";
import { citaDurationMinutes, citaServiceNames, estadoLabels, fullName, statusBadges, statusColors } from "./cita-utils";

export type { Appointment };

interface Props { appointments: Appointment[]; onUpdated?: () => void; }

export default function CalendarView({ appointments, onUpdated }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
  const [editingCita, setEditingCita] = useState<Appointment | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const appointmentsByDate = appointments.reduce<Record<string, Appointment[]>>((result, appointment) => {
    (result[appointment.fecha] ||= []).push(appointment);
    return result;
  }, {});

  const dayCitas = selectedDay ? [...(appointmentsByDate[selectedDay] || [])].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)) : [];
  const selectedCita = selectedCitaId ? appointments.find((cita) => cita.id === selectedCitaId) || null : null;
  // Detalle solo si la cita sigue en el día seleccionado (si cambió de fecha
  // al editar, se vuelve a la lista del día).
  const detailCita = selectedCita && selectedDay && selectedCita.fecha === selectedDay ? selectedCita : null;

  const openDay = (key: string) => { setSelectedDay(key); setSelectedCitaId(null); };
  const openCita = (key: string, citaId: string) => { setSelectedDay(key); setSelectedCitaId(citaId); };
  const closeDayModal = () => { setSelectedDay(null); setSelectedCitaId(null); };

  useEffect(() => {
    if (!selectedDay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editingCita) setEditingCita(null);
      else if (selectedCitaId) setSelectedCitaId(null);
      else { setSelectedDay(null); setSelectedCitaId(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDay, selectedCitaId, editingCita]);

  return (
    <>
      <div>
        <div className="flex items-center justify-between p-6 pb-4">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 rounded-xl hover:bg-brand-cream transition-colors" aria-label="Mes anterior"><ChevronLeft /></button>
          <h2 className="font-display text-xl font-bold">{format(currentDate, "MMMM yyyy", { locale: es })}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 rounded-xl hover:bg-brand-cream transition-colors" aria-label="Mes siguiente"><ChevronRight /></button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-brand-cream p-px">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <div key={day} className="bg-white text-center text-xs font-medium text-brand-text-light py-2">{day}</div>)}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const apps = appointmentsByDate[key] || [];
            const isSelected = selectedDay === key;
            return (
              <div key={key} className={`relative bg-white min-h-[80px] p-2 transition-colors ${isToday(day) ? "ring-2 ring-brand-green ring-inset" : ""} ${isSelected ? "bg-brand-green/10" : ""}`}>
                {apps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openDay(key)}
                    className="absolute inset-0 z-0 hover:bg-brand-green/10 transition-colors cursor-pointer"
                    aria-label={`Ver ${apps.length === 1 ? "1 cita" : `${apps.length} citas`} del ${format(day, "d 'de' MMMM")}`}
                  />
                )}
                <span className={`relative z-10 pointer-events-none text-sm ${isToday(day) ? "font-bold text-brand-green" : "text-brand-text"}`}>{format(day, "d")}</span>
                <div className="relative z-10 flex flex-wrap gap-1 mt-1 justify-center items-center">
                  {apps.slice(0, 3).map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => openCita(key, app.id)}
                      className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-150 ${statusColors[app.estado] || "bg-gray-400"}`}
                      title={`${app.hora_inicio} · ${fullName(app.clientes) || "Cliente"} · ${citaServiceNames(app).join(", ")}`}
                      aria-label={`Ver cita de ${fullName(app.clientes) || "cliente"} a las ${app.hora_inicio}`}
                    />
                  ))}
                  {apps.length > 3 && (
                    <button type="button" onClick={() => openDay(key)} className="text-[10px] font-semibold text-brand-text-light hover:text-brand-green px-1" aria-label="Ver todas las citas del día">+{apps.length - 3}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDay && (
        <div className="fixed inset-0 bg-brand-green/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Citas del día" onClick={closeDayModal}>
          <div className="bg-white rounded-3xl shadow-bento w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-brand-green to-brand-green-dark text-white flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white/70 text-sm">Agenda Essence</p>
                <h2 className="font-display text-xl font-bold mt-1 truncate">
                  {detailCita ? "Detalle de la cita" : `Citas del ${format(new Date(`${selectedDay}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}`}
                </h2>
              </div>
              <button type="button" onClick={closeDayModal} className="p-2 rounded-xl hover:bg-white/20 shrink-0" aria-label="Cerrar"><X size={20} /></button>
            </div>

            {!detailCita && (
              <div className="p-6 space-y-3">
                <p className="text-sm text-brand-text-light">
                  {dayCitas.length === 1 ? "1 cita programada" : `${dayCitas.length} citas programadas`} · Selecciona una para ver el detalle
                </p>
                {dayCitas.length === 0 && <p className="text-sm text-brand-text-light">No hay citas programadas para este día.</p>}
                {dayCitas.map((cita) => (
                  <button key={cita.id} type="button" onClick={() => setSelectedCitaId(cita.id)} className="w-full text-left p-4 rounded-2xl bg-brand-cream hover:bg-brand-green/10 transition-colors flex items-center gap-4">
                    <div className="w-16 shrink-0 text-center">
                      <p className="font-display font-bold text-brand-green">{cita.hora_inicio}</p>
                      <p className="text-[11px] text-brand-text-light">{cita.hora_fin ? cita.hora_fin : `${citaDurationMinutes(cita)} min`}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{fullName(cita.clientes) || "Cliente sin nombre"}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadges[cita.estado] || "bg-gray-100 text-gray-600"}`}>{estadoLabels[cita.estado] || cita.estado}</span>
                      </div>
                      <p className="text-xs text-brand-text-light truncate">{citaServiceNames(cita).join(", ")} · {fullName(cita.empleados) || "Sin trabajador asignado"}</p>
                    </div>
                    <Eye size={18} className="text-brand-green shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {detailCita && (
              <div className="p-6 space-y-5">
                <button type="button" onClick={() => setSelectedCitaId(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:underline">
                  <ArrowLeft size={16} /> Volver a las citas del día
                </button>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold truncate">{fullName(detailCita.clientes) || "Cliente sin nombre"}</h3>
                    <p className="text-xs text-brand-text-light capitalize">{format(new Date(`${detailCita.fecha}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${statusBadges[detailCita.estado] || "bg-gray-100 text-gray-600"}`}>{estadoLabels[detailCita.estado] || detailCita.estado}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: User, label: "Cliente", value: fullName(detailCita.clientes) || "Cliente sin nombre" },
                    { icon: Scissors, label: "Servicio", value: citaServiceNames(detailCita).join(", ") || "Sin servicio registrado" },
                    { icon: UserRound, label: "Trabajador", value: fullName(detailCita.empleados) || "Sin trabajador asignado" },
                    { icon: CalendarDays, label: "Fecha", value: format(new Date(`${detailCita.fecha}T12:00:00`), "d 'de' MMMM yyyy", { locale: es }) },
                    { icon: Clock, label: "Hora de inicio", value: detailCita.hora_inicio },
                    { icon: Clock, label: "Hora de finalización", value: detailCita.hora_fin ? `${detailCita.hora_fin} · ${citaDurationMinutes(detailCita)} min` : citaDurationMinutes(detailCita) > 0 ? `${citaDurationMinutes(detailCita)} min de duración` : "Por confirmar" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3 p-3 rounded-2xl bg-brand-cream">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-brand-green shrink-0"><row.icon size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-brand-text-light">{row.label}</p>
                        <p className="text-sm font-medium text-brand-text break-words">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="label-field">Observaciones</p>
                  <p className="text-sm text-brand-text bg-brand-cream rounded-xl p-3 whitespace-pre-wrap">{detailCita.notas?.trim() || "Sin observaciones."}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => setEditingCita(detailCita)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Pencil size={16} /> Editar cita</button>
                  <button type="button" onClick={closeDayModal} className="flex-1 py-3 rounded-xl bg-brand-cream text-brand-text font-semibold hover:bg-brand-cream/80 transition-colors">Cerrar</button>
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
    </>
  );
}
