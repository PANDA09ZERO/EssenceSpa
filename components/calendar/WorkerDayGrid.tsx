"use client";

import { useMemo } from "react";
import { formatTime } from "@/lib/utils";
import type { Appointment } from "./types";
import { citaClientName, citaDurationMinutes, citaServiceNames, estadoLabels, fullName, statusColors } from "./cita-utils";
import { buildWorkerColors, type WorkerColorFn } from "./worker-colors";

interface Props {
  appointments: Appointment[];
  onSelect: (cita: Appointment) => void;
  /** Colores por trabajador calculados sobre todas las citas, para que no cambien entre días. */
  colorFor?: WorkerColorFn;
}

const PX_PER_MIN = 1.2;
const SIN_ASIGNAR = "sin-asignar";


function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

export default function WorkerDayGrid({ appointments, onSelect, colorFor }: Props) {
  const workerColor = useMemo(() => colorFor || buildWorkerColors(appointments), [colorFor, appointments]);
  const columns = useMemo(() => {
    const map = new Map<string, { key: string; label: string; citas: Appointment[] }>();
    for (const cita of appointments) {
      const key = cita.id_empleado || SIN_ASIGNAR;
      if (!map.has(key)) map.set(key, { key, label: fullName(cita.empleados) || "Sin asignar", citas: [] });
      map.get(key)!.citas.push(cita);
    }
    return [...map.values()].sort((a, b) =>
      a.key === SIN_ASIGNAR ? 1 : b.key === SIN_ASIGNAR ? -1 : a.label.localeCompare(b.label),
    );
  }, [appointments]);

  const { startMinutes, endMinutes } = useMemo(() => {
    let start = 8 * 60;
    let end = 20 * 60;
    for (const cita of appointments) {
      const citaStart = toMinutes(cita.hora_inicio);
      if (citaStart !== null) {
        start = Math.min(start, citaStart);
        end = Math.max(end, citaStart + Math.max(citaDurationMinutes(cita), 30));
      }
    }
    return {
      startMinutes: Math.floor(start / 60) * 60,
      endMinutes: Math.min(Math.ceil(end / 60) * 60, 24 * 60),
    };
  }, [appointments]);

  const hours = Array.from({ length: (endMinutes - startMinutes) / 60 }, (_, index) => startMinutes + index * 60);
  const bodyHeight = (endMinutes - startMinutes) * PX_PER_MIN;

  if (appointments.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-cream">
      <div className="grid min-w-max" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(160px, 1fr))` }}>
        <div className="sticky left-0 z-20 border-b border-brand-cream bg-[#FAF9F6]" />
        {columns.map((column) => {
          const color = workerColor(column.key === SIN_ASIGNAR ? null : column.key);
          return (
          <div key={column.key} className="flex items-center gap-2.5 border-b border-l border-brand-cream bg-[#FAF9F6] px-3 py-2.5" style={{ boxShadow: `inset 0 3px 0 ${color.solid}` }}>
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: color.soft, color: color.text, boxShadow: `inset 0 0 0 1.5px ${color.solid}` }}>{column.label.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-text">{column.label}</p>
              <p className="text-xs text-brand-text-light">{column.citas.length === 1 ? "1 cita" : `${column.citas.length} citas`}</p>
            </div>
          </div>
          );
        })}

        <div className="sticky left-0 z-20 bg-white text-[11px] text-brand-text-light" style={{ height: bodyHeight }}>
          {hours.map((minute) => (
            <div key={minute} className="absolute left-0 right-0 -translate-y-2 whitespace-nowrap px-2" style={{ top: (minute - startMinutes) * PX_PER_MIN }}>
              {formatTime(`${String(minute / 60).padStart(2, "0")}:00`).replace(":00", "")}
            </div>
          ))}
        </div>

        {columns.map((column) => (
          <div key={column.key} className="relative border-l border-brand-cream" style={{ height: bodyHeight }}>
            {hours.map((minute) => (
              <div key={minute} className="absolute left-0 right-0 border-t border-brand-cream" style={{ top: (minute - startMinutes) * PX_PER_MIN }} />
            ))}
            {column.citas.map((cita) => {
              const start = toMinutes(cita.hora_inicio) ?? startMinutes;
              const duration = Math.max(citaDurationMinutes(cita), 30);
              const color = workerColor(cita.id_empleado);
              const cancelled = cita.estado === "cancelada";
              return (
                <button
                  key={cita.id}
                  type="button"
                  onClick={() => onSelect(cita)}
                  title={`${formatTime(cita.hora_inicio)} · ${citaClientName(cita)} · ${estadoLabels[cita.estado] || cita.estado}`}
                  className={`absolute left-1 right-1 flex flex-col justify-start overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs transition-shadow hover:shadow-sm ${cancelled ? "opacity-60" : ""}`}
                  style={{ top: (start - startMinutes) * PX_PER_MIN, height: duration * PX_PER_MIN - 4, backgroundColor: color.soft, borderColor: color.solid, color: color.text }}
                >
                  <p className={`truncate font-semibold ${cancelled ? "line-through" : ""}`}>{formatTime(cita.hora_inicio)} · {citaClientName(cita)}</p>
                  <p className="truncate">{citaServiceNames(cita).join(", ") || "Servicio"}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] opacity-90"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[cita.estado] || "bg-stone-400"}`} />{estadoLabels[cita.estado] || cita.estado}</p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
