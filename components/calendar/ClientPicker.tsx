"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";

export interface ClientOption {
  id: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
}

export interface ClientSelection {
  idCliente: string | null;
  nombreInvitado: string;
  telefonoInvitado: string;
}

interface Props {
  clients: ClientOption[];
  value: ClientSelection;
  onChange: (value: ClientSelection) => void;
  onClientCreated?: (client: ClientOption) => void;
  disabled?: boolean;
}

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const clientName = (client: ClientOption) =>
  `${client.nombre || ""} ${client.apellido || ""}`.trim() || "Cliente";

export default function ClientPicker({ clients, value, onChange, onClientCreated, disabled }: Props) {
  const [mode, setMode] = useState<"registrado" | "invitado">(
    value.idCliente || !value.nombreInvitado ? "registrado" : "invitado",
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ nombre: "", apellido: "", telefono: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value.idCliente ? clients.find((client) => client.id === value.idCliente) || null : null;

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return clients.slice(0, 8);
    return clients
      .filter((client) => [clientName(client), client.telefono || ""].some((field) => normalize(field).includes(term)))
      .slice(0, 8);
  }, [clients, query]);

  const exactMatch = useMemo(() => {
    const term = normalize(query);
    if (!term) return false;
    return clients.some(
      (client) => normalize(clientName(client)) === term || normalize(client.telefono || "") === term,
    );
  }, [clients, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  const selectClient = (client: ClientOption) => {
    onChange({ idCliente: client.id, nombreInvitado: "", telefonoInvitado: "" });
    setMode("registrado");
    setQuery("");
    setOpen(false);
    setCreating(false);
    setError("");
  };

  const clearSelection = () => {
    onChange({ idCliente: null, nombreInvitado: "", telefonoInvitado: "" });
    setQuery("");
    setOpen(true);
    setError("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const switchMode = (next: "registrado" | "invitado") => {
    setMode(next);
    setError("");
    setCreating(false);
    setOpen(false);
    if (next === "invitado") {
      const guestName = value.nombreInvitado || query;
      onChange({ idCliente: null, nombreInvitado: guestName, telefonoInvitado: value.telefonoInvitado });
    } else {
      onChange({ idCliente: null, nombreInvitado: "", telefonoInvitado: "" });
    }
  };

  const startCreate = (preset?: string) => {
    const text = (preset ?? query).trim();
    const [first, ...rest] = text.split(/\s+/);
    setCreateForm({ nombre: first || "", apellido: rest.join(" "), telefono: "" });
    setCreating(true);
    setOpen(false);
    setError("");
  };

  const createClient = async () => {
    if (!createForm.nombre.trim()) {
      setError("Escribe al menos el nombre.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: createForm.nombre.trim(),
          apellido: createForm.apellido.trim(),
          telefono: createForm.telefono.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear el cliente");
      const created: ClientOption = result.data;
      onClientCreated?.(created);
      selectClient(created);
      setCreateForm({ nombre: "", apellido: "", telefono: "" });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filtered[highlighted]) {
      event.preventDefault();
      selectClient(filtered[highlighted]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const optionClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${active ? "bg-brand-cream" : "hover:bg-brand-cream/60"}`;

  return (
    <div ref={rootRef} className="space-y-3">
      <div role="group" aria-label="Tipo de cliente" className="inline-flex rounded-full border border-stone-200 bg-brand-cream p-1">
        <button
          type="button"
          aria-pressed={mode === "registrado"}
          onClick={() => switchMode("registrado")}
          className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${mode === "registrado" ? "bg-white text-brand-green shadow-sm" : "text-stone-500"}`}
        >
          Cliente registrado
        </button>
        <button
          type="button"
          aria-pressed={mode === "invitado"}
          onClick={() => switchMode("invitado")}
          className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${mode === "invitado" ? "bg-white text-brand-green shadow-sm" : "text-stone-500"}`}
        >
          Invitado
        </button>
      </div>

      {mode === "registrado" ? (
        selected ? (
          <div className="flex items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <UserRound size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{clientName(selected)}</p>
              {selected.telefono && <p className="text-xs text-brand-text-light">{selected.telefono}</p>}
            </div>
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className="rounded-xl p-2 text-stone-500 hover:bg-white disabled:opacity-50"
              aria-label="Cambiar cliente"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-light" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls="client-picker-list"
                aria-autocomplete="list"
                aria-label="Buscar cliente por nombre o teléfono"
                className="input-field pl-9"
                placeholder="Buscar por nombre o teléfono"
                value={query}
                disabled={disabled}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
              />
            </div>
            {open && (
              <div
                id="client-picker-list"
                role="listbox"
                aria-label="Clientes"
                className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1 shadow-lg"
              >
                {filtered.length > 0 ? (
                  filtered.map((client, index) => (
                    <button
                      key={client.id}
                      type="button"
                      role="option"
                      aria-selected={index === highlighted}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => selectClient(client)}
                      className={optionClass(index === highlighted)}
                    >
                      <UserRound size={16} className="shrink-0 text-brand-green" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{clientName(client)}</span>
                        {client.telefono && <span className="block text-xs text-brand-text-light">{client.telefono}</span>}
                      </span>
                      {index === highlighted && <Check size={15} className="shrink-0 text-brand-green" />}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-brand-text-light">Sin coincidencias.</p>
                )}
                <div className="mt-1 border-t border-stone-100 pt-1">
                  {query.trim() && !exactMatch && (
                    <button type="button" onClick={() => startCreate()} className={optionClass(false)}>
                      <Plus size={16} className="shrink-0 text-brand-green" />
                      <span className="font-medium text-brand-green">Crear cliente «{query.trim()}»</span>
                    </button>
                  )}
                  {query.trim() && (
                    <button type="button" onClick={() => switchMode("invitado")} className={optionClass(false)}>
                      <UserRound size={16} className="shrink-0 text-stone-500" />
                      <span>Usar «{query.trim()}» solo para esta cita</span>
                    </button>
                  )}
                  <button type="button" onClick={() => startCreate()} className={optionClass(false)}>
                    <Plus size={16} className="shrink-0 text-stone-500" />
                    <span>Nuevo cliente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="guest-name">Nombre del invitado *</label>
            <input
              id="guest-name"
              className="input-field"
              placeholder="Nombre y apellido"
              value={value.nombreInvitado}
              maxLength={120}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, nombreInvitado: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label-field" htmlFor="guest-phone">Teléfono (opcional)</label>
            <input
              id="guest-phone"
              className="input-field"
              inputMode="tel"
              placeholder="Para contactarlo si es necesario"
              value={value.telefonoInvitado}
              maxLength={40}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, telefonoInvitado: event.target.value })}
            />
          </div>
          <p className="text-xs leading-5 text-brand-text-light sm:col-span-2">
            No se guardará en tu lista de clientes. Podrás registrarlo más adelante desde el detalle de la cita.
          </p>
        </div>
      )}

      {creating && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-brand-cream/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Nuevo cliente</p>
            <button
              type="button"
              onClick={() => { setCreating(false); setError(""); }}
              className="text-xs font-semibold text-stone-500"
            >
              Cancelar
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Nombre *"
              value={createForm.nombre}
              onChange={(event) => setCreateForm({ ...createForm, nombre: event.target.value })}
            />
            <input
              className="input-field"
              placeholder="Apellido"
              value={createForm.apellido}
              onChange={(event) => setCreateForm({ ...createForm, apellido: event.target.value })}
            />
            <input
              className="input-field sm:col-span-2"
              inputMode="tel"
              placeholder="Teléfono"
              value={createForm.telefono}
              onChange={(event) => setCreateForm({ ...createForm, telefono: event.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={() => void createClient()}
            disabled={saving || !createForm.nombre.trim()}
            className="btn-primary w-full"
          >
            {saving ? "Creando..." : "Crear y seleccionar"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
    </div>
  );
}
