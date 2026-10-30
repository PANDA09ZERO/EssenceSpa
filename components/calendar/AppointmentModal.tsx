"use client";

import { formatTime } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from "lucide-react";

const todayInPeru = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

interface FormData { cliente: string; servicios: string[]; fecha: string; hora: string; notas: string; empleado: string; }
interface Option { id: string; nombre: string; apellido?: string; precio?: number; duracion?: number; }
interface Props { onCreated?: () => void; }

export default function AppointmentModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ cliente: "", servicios: [], fecha: todayInPeru(), hora: "", notas: "", empleado: "" });
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Option[]>([]);
  const [servicios, setServicios] = useState<Option[]>([]);
  const [empleados, setEmpleados] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (!open) return;
    fetch("/api/citas/opciones")
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudieron cargar las opciones"); setClientes(result.clientes || []); setServicios(result.servicios || []); setEmpleados(result.empleados || []); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las opciones de la cita"));
  }, [open]);

  const selectedServices = servicios.filter((servicio) => formData.servicios.includes(servicio.id));
  const total = selectedServices.reduce((sum, servicio) => sum + Number(servicio.precio || 0), 0);
  const duration = selectedServices.reduce((sum, servicio) => sum + Number(servicio.duracion || 0), 0);
  const endTime = useMemo(() => {
    if (!formData.hora || !duration) return "";
    const [hours, minutes] = formData.hora.split(":").map(Number);
    const end = hours * 60 + minutes + duration;
    return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  }, [formData.hora, duration]);

  const reset = () => setFormData({ cliente: "", servicios: [], fecha: todayInPeru(), hora: "", notas: "", empleado: "" });
  const openPicker = () => {
    const date = formData.fecha ? new Date(`${formData.fecha}T12:00:00`) : new Date();
    const [hours, minutes] = formData.hora ? formData.hora.split(":").map(Number) : [9, 0];
    setPickerDate(date); setPickerHour(hours % 12 || 12); setPickerMinute(minutes); setPickerPeriod(hours >= 12 ? "PM" : "AM"); setPickerOpen(true);
  };
  const confirmPicker = () => {
    const month = String(pickerDate.getMonth() + 1).padStart(2, "0");
    const day = String(pickerDate.getDate()).padStart(2, "0");
    const hours24 = pickerPeriod === "PM" ? (pickerHour % 12) + 12 : pickerHour % 12;
    setFormData({ ...formData, fecha: `${pickerDate.getFullYear()}-${month}-${day}`, hora: `${String(hours24).padStart(2, "0")}:${String(pickerMinute).padStart(2, "0")}` }); setPickerOpen(false);
  };
  const calendarDays = () => {
    const first = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const totalDays = new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  };
  const addService = (id: string) => { if (id && !formData.servicios.includes(id)) setFormData({ ...formData, servicios: [...formData.servicios, id] }); };
  const removeService = (id: string) => setFormData({ ...formData, servicios: formData.servicios.filter((serviceId) => serviceId !== id) });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/citas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_cliente: formData.cliente, servicios: formData.servicios, id_empleado: formData.empleado || null, fecha: formData.fecha, hora_inicio: formData.hora, hora_fin: endTime || null, notas: formData.notas }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear la cita");
      setOpen(false); reset(); onCreated?.();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo crear la cita"); }
    finally { setLoading(false); }
  };

  if (!open) return <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Nueva Cita</button>;

  return <div className="fixed inset-0 bg-brand-green/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="appointment-modal bg-white rounded-3xl shadow-bento w-full max-w-lg max-h-[92vh] overflow-y-auto"><div className="p-6 bg-gradient-to-r from-brand-green to-brand-green-dark text-white"><div className="flex items-start justify-between"><div><p className="text-white/70 text-sm">Agenda Essence</p><h2 className="font-display text-2xl font-bold mt-1">Nueva cita</h2></div><button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/20" aria-label="Cerrar"><X size={20} /></button></div><p className="text-white/80 text-sm mt-3">Selecciona uno o varios servicios para calcular el total.</p></div>
    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
      <div><label className="label-field">Cliente *</label><select required className="input-field" value={formData.cliente} onChange={(event) => setFormData({ ...formData, cliente: event.target.value })}><option value="">Seleccionar cliente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre} {cliente.apellido}</option>)}</select></div>
      <div><label className="label-field">Servicios *</label><select className="input-field" value="" onChange={(event) => addService(event.target.value)}><option value="">Agregar servicio...</option>{servicios.filter((servicio) => !formData.servicios.includes(servicio.id)).map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre} · S/ {Number(servicio.precio || 0).toFixed(2)} · {servicio.duracion || 0} min</option>)}</select>{selectedServices.length > 0 && <div className="mt-3 space-y-2">{selectedServices.map((servicio) => <div key={servicio.id} className="flex items-center gap-3 p-3 rounded-2xl bg-brand-cream"><div className="flex-1"><p className="font-medium text-sm">{servicio.nombre}</p><p className="text-xs text-brand-text-light">{servicio.duracion || 0} min · S/ {Number(servicio.precio || 0).toFixed(2)}</p></div><button type="button" onClick={() => removeService(servicio.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" aria-label={`Quitar ${servicio.nombre}`}><Trash2 size={16} /></button></div>)}</div>}{selectedServices.length === 0 && <p className="text-xs text-red-500 mt-2">Agrega al menos un servicio.</p>}</div>
      <div><label className="label-field">Fecha y hora *</label><button type="button" onClick={openPicker} className="date-time-field w-full flex items-center gap-3 px-4 py-3 text-left"><CalendarDays className="text-brand-green" size={20} /><span className="flex-1"><strong className="block text-brand-text">{formData.fecha ? new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${formData.fecha}T12:00:00`)) : "Elegir fecha"}</strong><span className="text-xs text-brand-text-light">{formData.hora ? `${formatTime(formData.hora)} · ${duration || 0} min` : "Elegir hora"}</span></span><Clock3 className="text-brand-green" size={20} /></button></div>
      {pickerOpen && <div className="date-time-picker mt-3 rounded-3xl bg-brand-cream p-3 sm:p-5"><div className="flex items-center justify-between mb-4"><div><p className="text-xs uppercase tracking-wider text-brand-text-light">Agenda Essence</p><h3 className="font-display text-lg font-bold">Elige fecha y hora</h3></div><button type="button" onClick={() => setPickerOpen(false)} className="text-sm font-semibold text-brand-green">Cerrar</button></div><div className="grid grid-cols-2 gap-4 mb-5"><div className="rounded-2xl bg-brand-green p-4 text-white"><CalendarDays size={20} /><p className="text-xs text-white/70 mt-3">Fecha</p><p className="font-display text-lg font-bold">{new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(pickerDate)}</p></div><div className="rounded-2xl bg-brand-gold p-4 text-white"><Clock3 size={20} /><p className="text-xs text-white/70 mt-3">Hora</p><p className="font-display text-lg font-bold">{String(pickerHour).padStart(2, "0")}:{String(pickerMinute).padStart(2, "0")} {pickerPeriod}</p></div></div><div className="rounded-2xl bg-white p-4"><div className="flex items-center justify-between mb-4"><button type="button" onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))} className="p-2 rounded-xl hover:bg-brand-cream" aria-label="Mes anterior"><ChevronLeft size={18} /></button><strong className="font-display capitalize">{new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(pickerDate)}</strong><button type="button" onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))} className="p-2 rounded-xl hover:bg-brand-cream" aria-label="Mes siguiente"><ChevronRight size={18} /></button></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-text-light mb-2">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarDays().map((day, index) => <button key={`${day}-${index}`} type="button" disabled={!day} onClick={() => day && setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day))} className={`h-9 rounded-xl text-sm transition-all ${!day ? "invisible" : "hover:bg-brand-green/10"} ${day === pickerDate.getDate() ? "bg-brand-green text-white font-bold" : ""}`}>{day}</button>)}</div></div><div className="mt-4 rounded-2xl bg-white p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold">Hora</span><div className="flex rounded-xl border border-brand-green/20 overflow-hidden"><button type="button" aria-pressed={pickerPeriod === "AM"} onClick={() => setPickerPeriod("AM")} className={`min-h-11 px-4 py-2 text-sm ${pickerPeriod === "AM" ? "bg-brand-green text-white" : ""}`}>AM</button><button type="button" aria-pressed={pickerPeriod === "PM"} onClick={() => setPickerPeriod("PM")} className={`min-h-11 px-4 py-2 text-sm ${pickerPeriod === "PM" ? "bg-brand-green text-white" : ""}`}>PM</button></div></div><p className="mb-4 text-xs leading-5 text-brand-text-light">Elige la hora y los minutos. Horario de Perú.</p>
<div role="group" aria-label="Elegir hora" className="clock-face-small mx-auto mb-5">{[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, index) => {
const radians = index * Math.PI / 6;
return <button key={hour} type="button" aria-label={"Hora " + hour} aria-pressed={pickerHour === hour} onClick={() => setPickerHour(hour)} className={"clock-number-small " + (pickerHour === hour ? "selected" : "")} style={{ left: (50 + Math.sin(radians) * 37.5) + "%", top: (50 - Math.cos(radians) * 37.5) + "%" }}>{hour}</button>;
})}<div aria-hidden="true" className="clock-hand-small" style={{ transform: "translateX(-50%) rotate(" + (pickerHour % 12 * 30) + "deg)" }} /><div aria-hidden="true" className="clock-dot-small" /></div>
<p className="mb-2 text-xs font-semibold text-brand-text">Minutos</p><div role="group" aria-label="Elegir minutos" className="grid grid-cols-4 gap-2">{[0, 15, 30, 45].map((minute) => <button key={minute} type="button" aria-label={minute + " minutos"} aria-pressed={pickerMinute === minute} onClick={() => setPickerMinute(minute)} className={"min-h-11 rounded-xl text-sm " + (pickerMinute === minute ? "bg-brand-green text-white" : "bg-brand-cream")}>{String(minute).padStart(2, "0")}</button>)}</div></div><div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setPickerOpen(false)} className="btn-secondary">Cancelar</button><button type="button" onClick={confirmPicker} className="btn-primary">Confirmar</button></div></div>}
      {duration > 0 && <div className="appointment-summary flex items-center justify-between rounded-2xl bg-brand-green/10 px-4 py-3 text-sm"><span className="text-brand-text-light">Duración estimada: <strong className="text-brand-green">{duration} min</strong></span><span className="font-bold text-brand-green">Total S/ {total.toFixed(2)}{endTime && ` · hasta ${formatTime(endTime)}`}</span></div>}
      <div><label className="label-field">Empleado</label><select className="input-field" value={formData.empleado} onChange={(event) => setFormData({ ...formData, empleado: event.target.value })}><option value="">Sin asignar</option>{empleados.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.nombre} {empleado.apellido}</option>)}</select></div>
      <div><label className="label-field">Notas</label><textarea className="input-field" rows={3} placeholder="Notas adicionales" value={formData.notas} onChange={(event) => setFormData({ ...formData, notas: event.target.value })} /></div>
      {error && <p className="text-sm text-red-500">{error}</p>}<button type="submit" className="btn-primary w-full" disabled={loading || selectedServices.length === 0}>{loading ? "Guardando cita..." : "Guardar cita"}</button>
    </form></div></div>;
}
