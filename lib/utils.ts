import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? "p.m." : "a.m.";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function formatDateTime(date: string): string {
  return `${formatDate(date)} ${formatTime(date.split("T")[1] || date.split(" ")[1] || "00:00")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getDaysOfWeek(): string[] {
  return ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
}

export function getDayName(date: Date): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[date.getDay()];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
