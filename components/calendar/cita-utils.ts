import type { Appointment } from "./types";
import { formatServiceName } from "@/lib/utils";

// Presentación de estados de citas (calendario y paneles de detalle).
export const statusColors: Record<string, string> = {
  confirmada: "bg-emerald-600",
  pendiente: "bg-amber-500",
  en_progreso: "bg-sky-600",
  completada: "bg-stone-500",
  cancelada: "bg-stone-300",
};

export const statusBadges: Record<string, string> = {
  confirmada: "bg-emerald-50 text-emerald-800",
  pendiente: "bg-amber-50 text-amber-800",
  en_progreso: "bg-sky-50 text-sky-800",
  completada: "bg-stone-100 text-stone-600",
  cancelada: "bg-stone-100 text-stone-500 line-through",
};

export const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_progreso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export function fullName(person: { nombre?: string | null; apellido?: string | null } | null | undefined): string | null {
  if (!person) return null;
  const full = `${person.nombre || ""} ${person.apellido || ""}`.trim();
  return full || null;
}

// Nombre visible de una cita: cliente registrado, invitado o un texto neutro.
export function citaClientName(
  cita: { clientes?: { nombre?: string | null; apellido?: string | null } | null; nombre_invitado?: string | null } | null | undefined,
): string {
  return fullName(cita?.clientes) || cita?.nombre_invitado?.trim() || "Cliente sin nombre";
}

// Una cita es de invitado cuando no tiene cliente registrado pero sí nombre.
export function isGuestCita(
  cita: { clientes?: { nombre?: string | null; apellido?: string | null } | null; nombre_invitado?: string | null } | null | undefined,
): boolean {
  return !fullName(cita?.clientes) && Boolean(cita?.nombre_invitado?.trim());
}

function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

// Compare stored 24-hour values, never their 12-hour display labels.
export function compareCitaSchedule(
  a: { fecha: string; hora_inicio: string },
  b: { fecha: string; hora_inicio: string },
): number {
  return a.fecha.localeCompare(b.fecha) ||
    (toMinutes(a.hora_inicio) ?? Infinity) - (toMinutes(b.hora_inicio) ?? Infinity);
}

// Nombres de los servicios de una cita (detalles o servicio principal).
export function citaServiceNames(cita: Appointment): string[] {
  const names = (cita.cita_detalles || [])
    .map((detail) => detail.servicios?.nombre)
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names.map(formatServiceName);
  return cita.servicios?.nombre ? [formatServiceName(cita.servicios.nombre)] : [];
}

// Duración total en minutos: desde los detalles, el servicio o el rango de horas.
export function citaDurationMinutes(cita: Appointment): number {
  const fromDetails = (cita.cita_detalles || []).reduce((sum, detail) => sum + Number(detail.servicios?.duracion || 0), 0);
  if (fromDetails > 0) return fromDetails;
  if (cita.servicios?.duracion) return Number(cita.servicios.duracion) || 0;
  const start = toMinutes(cita.hora_inicio);
  const end = toMinutes(cita.hora_fin);
  if (start !== null && end !== null && end > start) return end - start;
  return 0;
}
