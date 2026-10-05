import { SupabaseClient } from "@supabase/supabase-js";

// Utilidades de validación de horarios para citas (lado servidor).
// Detecta solapes de intervalos para un trabajador en una fecha dada.

// Duración de respaldo cuando una cita no tiene hora_fin ni duración registrada.
const FALLBACK_DURATION_MINUTES = 60;

export function toMinutes(hhmm: string | null | undefined): number | null {
  if (typeof hhmm !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function toHHMM(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export interface ConflictSlot {
  hora_inicio: string;
  hora_fin: string;
}

interface ConflictParams {
  citaId?: string | null;
  idEmpleado: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
}

// Devuelve `conflict` si el trabajador ya tiene otra cita que se solapa en
// el rango indicado, o `error` si la consulta falló. Las citas canceladas
// no bloquean el horario. La propia `citaId` se excluye del análisis.
export async function findEmpleadoConflict(
  supabase: SupabaseClient,
  params: ConflictParams,
): Promise<{ error?: string; conflict?: ConflictSlot }> {
  const { citaId, idEmpleado, fecha, horaInicio, horaFin } = params;
  if (!idEmpleado) return {};

  const start = toMinutes(horaInicio);
  if (start === null) return { error: "La hora de inicio no es válida" };
  let end = toMinutes(horaFin);
  if (end === null || end <= start) end = start + FALLBACK_DURATION_MINUTES;

  let query = supabase
    .from("citas")
    .select("id, hora_inicio, hora_fin, estado, servicios(duracion)")
    .eq("id_empleado", idEmpleado)
    .eq("fecha", fecha);
  if (citaId) query = query.neq("id", citaId);

  const { data, error } = await query;
  if (error) return { error: error.message };

  for (const other of (data || []) as Array<{ id: string; hora_inicio: string; hora_fin: string | null; estado: string | null; servicios: { duracion?: number | null } | null }>) {
    if (other.estado === "cancelada") continue;
    const otherStart = toMinutes(other.hora_inicio);
    if (otherStart === null) continue;
    const otherDuration = Number(other.servicios?.duracion || 0);
    let otherEnd = toMinutes(other.hora_fin);
    if (otherEnd === null || otherEnd <= otherStart) {
      otherEnd = otherStart + (otherDuration > 0 ? otherDuration : FALLBACK_DURATION_MINUTES);
    }
    if (start < otherEnd && otherStart < end) {
      return { conflict: { hora_inicio: other.hora_inicio, hora_fin: toHHMM(otherEnd) } };
    }
  }
  return {};
}

export function conflictMessage(conflict: ConflictSlot): string {
  return `El trabajador ya tiene una cita ese día de ${conflict.hora_inicio} a ${conflict.hora_fin}. Elige otro horario u otro trabajador.`;
}
