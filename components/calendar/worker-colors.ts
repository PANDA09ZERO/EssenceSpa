import type { Appointment } from "./types";

export interface WorkerColor {
  /** Nombre del tono, útil para depurar o mostrar en una leyenda. */
  name: string;
  /** Tono principal: bordes, puntos y avatar. */
  solid: string;
  /** Fondo suave para bloques de cita. */
  soft: string;
  /** Texto legible sobre el fondo suave. */
  text: string;
}

// Tonos apagados y terrosos que conviven con el carbón, la crema y el taupe
// de Essence. Todos los textos cumplen contraste AA sobre su fondo suave.
// Ordenados para que los primeros tonos sean los más distintos entre sí.
export const WORKER_PALETTE: WorkerColor[] = [
  { name: "Salvia", solid: "#6F8A73", soft: "#EDF2EC", text: "#3D523F" },
  { name: "Arcilla", solid: "#B4775C", soft: "#F7ECE6", text: "#6B3F2C" },
  { name: "Pizarra", solid: "#5F7C96", soft: "#EBF0F5", text: "#34495C" },
  { name: "Ocre", solid: "#A88A4E", soft: "#F6F0E2", text: "#5E4A22" },
  { name: "Ciruela", solid: "#8B6787", soft: "#F3ECF2", text: "#553D52" },
  { name: "Laguna", solid: "#5E8A88", soft: "#EAF2F1", text: "#335250" },
  { name: "Rosa palo", solid: "#B97F8E", soft: "#F7ECEF", text: "#6B3E4A" },
  { name: "Taupe", solid: "#8A8076", soft: "#F1EFEC", text: "#4E4740" },
];

export const UNASSIGNED_COLOR: WorkerColor = { name: "Sin asignar", solid: "#A8A29E", soft: "#F5F5F4", text: "#57534E" };

export interface WorkerRef { id: string; created_at?: string | null }

/**
 * Asigna a cada trabajador un color según el orden en que se creó en el sistema:
 * el primero recibe el primer tono, el segundo el siguiente, etc. Así:
 * - cada trabajador conserva su color en todas las fechas y pantallas;
 * - al crear un trabajador nuevo recibe el siguiente tono sin cambiar el de los demás;
 * - los tonos no se repiten mientras haya hasta 8 trabajadores.
 * Si aún no se cargó la lista del equipo, se usa como respaldo el orden de los ids
 * que aparecen en las citas.
 */
export function buildWorkerColors(appointments: Pick<Appointment, "id_empleado">[], employees: WorkerRef[] = []) {
  const ordered = [...employees]
    // Sin fecha de creación van al final; el id desempata para que el orden sea estable.
    .sort((a, b) => (a.created_at ? 0 : 1) - (b.created_at ? 0 : 1) || (a.created_at || "").localeCompare(b.created_at || "") || a.id.localeCompare(b.id))
    .map((employee) => employee.id);
  const known = new Set(ordered);
  const extra = [...new Set(appointments.map((cita) => cita.id_empleado).filter((id): id is string => Boolean(id) && !known.has(id!)))].sort();
  const assigned = new Map([...ordered, ...extra].map((id, index) => [id, WORKER_PALETTE[index % WORKER_PALETTE.length]] as const));
  return (id: string | null | undefined): WorkerColor => (id && assigned.get(id)) || UNASSIGNED_COLOR;
}

export type WorkerColorFn = ReturnType<typeof buildWorkerColors>;
