import type { Appointment } from "./types";

// Presentación de estados de citas (calendario y paneles de detalle).
export const statusColors: Record<string, string> = {
  confirmada: "bg-green-500",
  pendiente: "bg-yellow-500",
  en_progreso: "bg-blue-500",
  completada: "bg-purple-500",
  cancelada: "bg-gray-400",
};

export const statusBadges: Record<string, string> = {
  confirmada: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  en_progreso: "bg-blue-100 text-blue-700",
  completada: "bg-purple-100 text-purple-700",
  cancelada: "bg-gray-100 text-gray-600",
};

export const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  en_progreso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export function fullName(person: { nombre: string; apellido: string } | null | undefined): string | null {
  if (!person) return null;
  const full = `${person.nombre || ""} ${person.apellido || ""}`.trim();
  return full || null;
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
  if (names.length > 0) return names;
  return cita.servicios?.nombre ? [cita.servicios.nombre] : [];
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
