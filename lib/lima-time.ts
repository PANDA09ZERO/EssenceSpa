/**
 * Utilidades de fecha en hora de Perú (America/Lima).
 *
 * Lima está en UTC-5 todo el año (no tiene horario de verano), así que
 * convertir una fecha local a UTC es simplemente sumarle 5 horas.
 * Se usa para que un movimiento registrado a las 21:00 del 30 de octubre
 * cuente como "30 de octubre" y no como "31" por el UTC.
 */

export const LIMA_TIME_ZONE = "America/Lima";

/** Devuelve la fecha de Lima en formato YYYY-MM-DD. */
export function limaDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  // en-CA produce YYYY-MM-DD de forma estable.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Fecha de hoy en Lima, YYYY-MM-DD. */
export function limaTodayKey(): string {
  return limaDateKey(new Date());
}

/** Suma (o resta) días a una clave YYYY-MM-DD sin cruzar zonas horarias. */
export function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

/** Días completos entre dos claves YYYY-MM-DD (b - a). */
export function daysBetweenKeys(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/**
 * Rango UTC [start, end) que cubre las fechas de Lima `desde`..`hasta`.
 * `end` es exclusivo: el inicio del día siguiente a `hasta`.
 */
export function limaDayRangeUtc(desde: string, hasta: string): { start: string; end: string } {
  return {
    start: `${desde}T05:00:00.000Z`,
    end: `${addDaysKey(hasta, 1)}T05:00:00.000Z`,
  };
}

/** Valida una clave YYYY-MM-DD que exista de verdad (rechaza 2026-02-31). */
export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "Viernes, 30 de octubre" (a mediodía para que no se corra la fecha). */
export function formatDayLabel(key: string): string {
  const label = new Date(`${key}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "30 oct" para rangos compactos. */
export function formatShortDay(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}
