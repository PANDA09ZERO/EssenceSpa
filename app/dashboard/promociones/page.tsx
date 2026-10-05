"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Edit2, Search, Tag, X } from "lucide-react";
import CreateResourceModal from "@/components/forms/CreateResourceModal";

interface Promocion {
  id: string;
  nombre: string;
  descripcion: string | null;
  descuento: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
}

interface PromocionForm {
  nombre: string;
  descripcion: string;
  descuento: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}

const emptyForm: PromocionForm = { nombre: "", descripcion: "", descuento: "", fecha_inicio: "", fecha_fin: "", activa: true };

export default function PromocionesPage() {
  const [search, setSearch] = useState("");
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promocionEditando, setPromocionEditando] = useState<Promocion | null>(null);
  const [form, setForm] = useState<PromocionForm>(emptyForm);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/promociones")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar las promociones");
        setPromociones(result.data || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las promociones"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = promociones.filter((promocion) =>
    `${promocion.nombre} ${promocion.descripcion || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const abrirEdicion = (promocion: Promocion) => {
    setPromocionEditando(promocion);
    setForm({
      nombre: promocion.nombre,
      descripcion: promocion.descripcion || "",
      descuento: String(promocion.descuento),
      fecha_inicio: promocion.fecha_inicio || "",
      fecha_fin: promocion.fecha_fin || "",
      activa: promocion.activa,
    });
    setError("");
  };

  const guardarEdicion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!promocionEditando) return;
    setGuardando(true);
    setError("");
    try {
      const response = await fetch(`/api/promociones/${promocionEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          descuento: Number(form.descuento),
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
          activa: form.activa,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la promoción");
      setPromociones((current) => current.map((item) => item.id === result.data.id ? result.data : item));
      setPromocionEditando(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la promoción");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-green">Promociones</h1>
          <p className="text-brand-text-light mt-1">Gestiona tus promociones</p>
        </div>
        <CreateResourceModal title="Promoción" endpoint="/api/promociones" fields={[{ name: "nombre", label: "Nombre", required: true }, { name: "descripcion", label: "Descripción" }, { name: "descuento", label: "Descuento (%)", type: "number", required: true }, { name: "fecha_inicio", label: "Desde", type: "date" }, { name: "fecha_fin", label: "Hasta", type: "date" }]} onCreated={() => window.location.reload()} />
      </div>

      <div className="bento-card">
        <label className="mb-5 flex items-center gap-3 rounded-xl bg-brand-cream px-4 py-3">
          <Search className="text-brand-text-light" size={20} />
          <input type="search" placeholder="Buscar promoción..." value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-brand-text outline-none" />
        </label>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {loading ? <p className="py-8 text-center text-sm text-brand-text-light">Cargando promociones...</p> : filtered.length ? <div className="divide-y divide-brand-cream-dark">
          {filtered.map((promocion) => (
            <article key={promocion.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold"><Tag size={21} /></div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-brand-text">{promocion.nombre}</h2>
                  <p className="mt-1 text-sm text-brand-text-light">{promocion.descripcion || `${Number(promocion.descuento)}% de descuento`}</p>
                  {(promocion.fecha_inicio || promocion.fecha_fin) && <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-text-light"><CalendarDays size={13} />{promocion.fecha_inicio || "Sin inicio"} - {promocion.fecha_fin || "Sin vencimiento"}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="font-display text-lg font-bold text-brand-green">{Number(promocion.descuento)}%</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${promocion.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{promocion.activa ? "Activa" : "Inactiva"}</span>
                <button type="button" onClick={() => abrirEdicion(promocion)} className="flex items-center gap-2 rounded-lg border border-brand-green/15 px-3 py-2 text-sm font-medium text-brand-green transition-colors hover:bg-brand-green hover:text-white"><Edit2 size={15} />Editar</button>
              </div>
            </article>
          ))}
        </div> : <p className="py-10 text-center text-sm text-brand-text-light">No hay promociones que coincidan con tu búsqueda.</p>}
      </div>

      {promocionEditando && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-bento">
          <div className="flex items-center justify-between border-b border-brand-cream-dark p-6">
            <h2 className="font-display text-xl font-bold">Editar promoción</h2>
            <button type="button" onClick={() => setPromocionEditando(null)} className="rounded-lg p-2 hover:bg-brand-cream" aria-label="Cerrar"><X size={20} /></button>
          </div>
          <form onSubmit={guardarEdicion} className="space-y-4 p-6">
            <div><label className="label-field">Nombre *</label><input required className="input-field" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></div>
            <div><label className="label-field">Descripción</label><textarea className="input-field min-h-20" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></div>
            <div><label className="label-field">Descuento (%) *</label><input required type="number" min="0" max="100" step="0.01" className="input-field" value={form.descuento} onChange={(event) => setForm({ ...form, descuento: event.target.value })} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label-field">Desde</label><input type="date" className="input-field" value={form.fecha_inicio} onChange={(event) => setForm({ ...form, fecha_inicio: event.target.value })} /></div>
              <div><label className="label-field">Hasta</label><input type="date" className="input-field" value={form.fecha_fin} onChange={(event) => setForm({ ...form, fecha_fin: event.target.value })} /></div>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-brand-text"><input type="checkbox" checked={form.activa} onChange={(event) => setForm({ ...form, activa: event.target.checked })} className="h-4 w-4 accent-brand-green" />Promoción activa</label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={guardando} className="btn-primary w-full">{guardando ? "Guardando..." : "Guardar cambios"}</button>
          </form>
        </div>
      </div>}
    </div>
  );
}
