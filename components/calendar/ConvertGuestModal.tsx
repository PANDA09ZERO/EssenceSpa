"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, UserPlus, X } from "lucide-react";
import type { Appointment } from "./types";
import { citaClientName } from "./cita-utils";

interface Props {
  cita: Appointment;
  onClose: () => void;
  onConverted?: () => void;
}

function splitGuestName(guestName: string | null | undefined) {
  const text = (guestName || "").trim();
  if (!text) return { nombre: "", apellido: "" };
  const [first, ...rest] = text.split(/\s+/);
  return { nombre: first, apellido: rest.join(" ") };
}

export default function ConvertGuestModal({ cita, onClose, onConverted }: Props) {
  const initial = splitGuestName(cita.nombre_invitado);
  const [nombre, setNombre] = useState(initial.nombre);
  const [apellido, setApellido] = useState(initial.apellido);
  const [telefono, setTelefono] = useState(cita.telefono_invitado || "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/citas/${cita.id}/convertir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar el cliente");
      onConverted?.();
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "No se pudo registrar el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-green/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar invitado como cliente"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-bento" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 rounded-t-3xl bg-gradient-to-r from-brand-green to-brand-green-dark p-6 text-white">
          <div className="min-w-0">
            <p className="text-sm text-white/70">Agenda Essence</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Registrar como cliente</h2>
            <p className="mt-2 truncate text-sm text-white/80">Invitado: {citaClientName(cita)}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl p-2 hover:bg-white/20" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600" role="alert">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="label-field" htmlFor="convert-nombre">Nombre *</label>
            <input id="convert-nombre" className="input-field" value={nombre} maxLength={120} onChange={(event) => setNombre(event.target.value)} />
          </div>
          <div>
            <label className="label-field" htmlFor="convert-apellido">Apellido</label>
            <input id="convert-apellido" className="input-field" value={apellido} maxLength={120} onChange={(event) => setApellido(event.target.value)} />
          </div>
          <div>
            <label className="label-field" htmlFor="convert-telefono">Teléfono</label>
            <input id="convert-telefono" className="input-field" inputMode="tel" value={telefono} maxLength={40} onChange={(event) => setTelefono(event.target.value)} />
          </div>
          <div>
            <label className="label-field" htmlFor="convert-email">Email (opcional)</label>
            <input id="convert-email" type="email" className="input-field" value={email} maxLength={160} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-brand-cream py-3 font-semibold text-brand-text transition-colors hover:bg-brand-cream/80">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex flex-1 items-center justify-center gap-2" disabled={loading || !nombre.trim()}>
              <UserPlus size={16} />
              {loading ? "Registrando..." : "Registrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
