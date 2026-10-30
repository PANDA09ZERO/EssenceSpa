"use client";
import { formatTime } from "@/lib/utils";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import type { Appointment } from "./types";
import { estadoLabels, fullName } from "./cita-utils";

interface Option { id: string; nombre: string; apellido?: string; precio?: number; duracion?: number; }
interface OptionsState { clientes: Option[]; servicios: Option[]; empleados: Option[]; }
interface Props { cita: Appointment; onClose: () => void; onSaved?: () => void; }

const ESTADOS = ["pendiente", "confirmada", "en_progreso", "completada", "cancelada"];

export default function AppointmentEditModal({ cita, onClose, onSaved }: Props) {
  const [cliente, setCliente] = useState(cita.id_cliente || "");
  const [servicios, setServicios] = useState<string[]>(() => {
    const fromDetails = (cita.cita_detalles || []).map((detail) => detail.id_servicio).filter((serviceId): serviceId is string => Boolean(serviceId));
    if (fromDetails.length > 0) return fromDetails;
    return cita.id_servicio ? [cita.id_servicio] : [];
  });
  const [fecha, setFecha] = useState(cita.fecha);
  const [hora, setHora] = useState(cita.hora_inicio);
  const [empleado, setEmpleado] = useState(cita.id_empleado || "");
  const [estado, setEstado] = useState(cita.estado);
  const [notas, setNotas] = useState(cita.notas || "");
  const [options, setOptions] = useState<OptionsState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/citas/opciones")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar las opciones");
        setOptions({ clientes: result.clientes || [], servicios: result.servicios || [], empleados: result.empleados || [] });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las opciones de la cita"));
  }, []);

  const selectedServices = (options?.servicios || []).filter((service) => servicios.includes(service.id));
  const duration = selectedServices.reduce((sum, service) => sum + Number(service.duracion || 0), 0);
  const endTime = useMemo(() => {
    if (!hora || !duration) return "";
    const [hours, minutes] = hora.split(":").map(Number);
    const total = hours * 60 + minutes + duration;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [hora, duration]);

  const addService = (id: string) => { if (id && !servicios.includes(id)) setServicios([...servicios, id]); };
  const removeService = (id: string) => setServicios(servicios.filter((serviceId) => serviceId !== id));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cliente: cliente, servicios, id_empleado: empleado || null, fecha, hora_inicio: hora, estado, notas }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la cita");
      onSaved?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar la cita");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-brand-green/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Editar cita" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-bento w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 bg-gradient-to-r from-brand-green to-brand-green-dark text-white">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-white/70 text-sm">Agenda Essence</p>
              <h2 className="font-display text-2xl font-bold mt-1">Editar cita</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 shrink-0" aria-label="Cerrar"><X size={20} /></button>
          </div>
          <p className="text-white/80 text-sm mt-3 truncate">Cliente: <strong>{fullName(cita.clientes) || "Cliente sin nombre"}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm" role="alert"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

          <div>
            <label className="label-field">Cliente *</label>
            <select required className="input-field" value={cliente} onChange={(event) => setCliente(event.target.value)} disabled={!options}>
              <option value="">Seleccionar cliente</option>
              {(options?.clientes || []).map((item) => <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>)}
            </select>
          </div>

          <div>
            <label className="label-field">Servicios *</label>
            <select className="input-field" value="" onChange={(event) => addService(event.target.value)} disabled={!options}>
              <option value="">Agregar servicio...</option>
              {(options?.servicios || []).filter((item) => !servicios.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.nombre} · S/ {Number(item.precio || 0).toFixed(2)} · {item.duracion || 0} min</option>)}
            </select>
            {selectedServices.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedServices.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-brand-cream">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-xs text-brand-text-light">{item.duracion || 0} min · S/ {Number(item.precio || 0).toFixed(2)}</p>
                    </div>
                    <button type="button" onClick={() => removeService(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl" aria-label={`Quitar ${item.nombre}`}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-red-500 mt-2">Agrega al menos un servicio.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-field">Fecha *</label><input type="date" required className="input-field" value={fecha} onChange={(event) => setFecha(event.target.value)} /></div>
            <div><label className="label-field">Hora de inicio *</label><input type="time" required className="input-field" value={hora} onChange={(event) => setHora(event.target.value)} />{hora && <p className="mt-2 text-xs text-brand-text-light">{formatTime(hora)}</p>}</div>
          </div>

          {duration > 0 && <div className="flex items-center justify-between rounded-2xl bg-brand-green/10 px-4 py-3 text-sm"><span className="text-brand-text-light">Duración: <strong className="text-brand-green">{duration} min</strong></span><span className="font-bold text-brand-green">{endTime && `hasta las ${formatTime(endTime)}`}</span></div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Trabajador</label>
              <select className="input-field" value={empleado} onChange={(event) => setEmpleado(event.target.value)} disabled={!options}>
                <option value="">Sin asignar</option>
                {(options?.empleados || []).map((item) => <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Estado</label>
              <select className="input-field" value={estado} onChange={(event) => setEstado(event.target.value)}>
                {ESTADOS.map((value) => <option key={value} value={value}>{estadoLabels[value] || value}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-field">Observaciones</label>
            <textarea className="input-field" rows={3} placeholder="Información adicional de la cita" value={notas} onChange={(event) => setNotas(event.target.value)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-brand-cream text-brand-text font-semibold hover:bg-brand-cream/80 transition-colors">Cancelar</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading || servicios.length === 0 || !cliente || !fecha || !hora}>
              <Save size={16} /> {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
