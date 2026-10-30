export function peruDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function shiftDateKey(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function agendaDateLabel(date: string, today: string): string {
  const relative = date === today ? "Hoy" : date === shiftDateKey(today, -1) ? "Ayer" : date === shiftDateKey(today, 1) ? "Mañana" : "";
  const formatted = new Intl.DateTimeFormat("es-PE", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima",
  }).format(new Date(`${date}T12:00:00Z`));
  return relative ? `${relative} · ${formatted}` : formatted;
}
