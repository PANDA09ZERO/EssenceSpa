"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit2, Trash2, X } from "lucide-react";
import Card from "@/components/bento/Card";
import CreateResourceModal from "@/components/forms/CreateResourceModal";

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
}

interface Servicio {
  categoria: string;
  estado: "activo" | "inactivo";
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", icono: "" });
  const [guardando, setGuardando] = useState(false);
  const [categoriaEliminando, setCategoriaEliminando] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    try {
      const [categoriasResponse, serviciosResponse] = await Promise.all([
        fetch("/api/categorias"),
        fetch("/api/servicios"),
      ]);
      const [categoriasResult, serviciosResult] = await Promise.all([
        categoriasResponse.json(),
        serviciosResponse.json(),
      ]);
      if (!categoriasResponse.ok) throw new Error(categoriasResult.error || "No se pudieron cargar las categorías");
      if (!serviciosResponse.ok) throw new Error(serviciosResult.error || "No se pudieron cargar los servicios");
      setCategorias(categoriasResult.data || []);
      setServicios(serviciosResult.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirEdicion = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setForm({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || "",
      icono: categoria.icono || "",
    });
    setFormError("");
  };

  const guardarCategoria = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoriaEditando) return;

    setGuardando(true);
    setFormError("");
    try {
      const response = await fetch(`/api/categorias/${categoriaEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          icono: form.icono.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la categoría");
      setCategoriaEditando(null);
      await cargarDatos();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la categoría");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCategoria = async (categoria: Categoria) => {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;

    setCategoriaEliminando(categoria.id);
    setActionError("");
    try {
      const response = await fetch(`/api/categorias/${categoria.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar la categoría");
      await cargarDatos();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la categoría");
    } finally {
      setCategoriaEliminando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-green">Categorías</h1>
          <p className="text-brand-text-light mt-1">Organiza tus servicios por categoría</p>
        </div>
        <CreateResourceModal title="Categoría" endpoint="/api/categorias" fields={[{ name: "nombre", label: "Nombre", required: true }, { name: "descripcion", label: "Descripción" }]} onCreated={cargarDatos} />
      </div>

      {actionError && <div role="alert" className="bento-card text-sm text-red-500">{actionError}</div>}
      {loading && <div className="bento-card text-center text-brand-text-light">Cargando categorías...</div>}
      {error && <div className="bento-card text-center text-red-500">{error}</div>}
      {!loading && !error && categorias.length === 0 && <div className="bento-card text-center text-brand-text-light">Aún no hay categorías registradas.</div>}

      {!loading && !error && categorias.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categorias.map((cat) => {
            const serviciosDeCategoria = servicios.filter((servicio) => servicio.categoria === cat.nombre);
            const activo = serviciosDeCategoria.some((servicio) => servicio.estado === "activo");
            return (
              <Card key={cat.id}>
                <div className="text-center">
                  {cat.icono && <div className="text-3xl mb-2">{cat.icono}</div>}
                  <h3 className="font-display font-bold">{cat.nombre.toUpperCase()}</h3>
                  {cat.descripcion && <p className="text-xs text-brand-text-light mt-1">{cat.descripcion}</p>}
                  <p className="text-sm text-brand-text-light mt-1">{serviciosDeCategoria.length} servicios</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                  <div className="mt-4 flex justify-center gap-2">
                    <button type="button" onClick={() => abrirEdicion(cat)} className="inline-flex items-center gap-2 rounded-xl border border-brand-cream-dark px-3 py-2 text-sm text-brand-green transition-colors hover:bg-brand-cream" aria-label={`Editar categoría ${cat.nombre}`}>
                      <Edit2 size={15} /> Editar
                    </button>
                    <button type="button" onClick={() => eliminarCategoria(cat)} disabled={categoriaEliminando === cat.id} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" aria-label={`Eliminar categoría ${cat.nombre}`}>
                      <Trash2 size={15} /> {categoriaEliminando === cat.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {categoriaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-category-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-bento">
            <div className="flex items-center justify-between border-b border-brand-cream-dark p-6">
              <h2 id="edit-category-title" className="font-display text-xl font-bold">Editar categoría</h2>
              <button type="button" onClick={() => setCategoriaEditando(null)} className="rounded-xl p-2 hover:bg-brand-cream" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={guardarCategoria} className="space-y-4 p-6">
              <div>
                <label htmlFor="categoria-nombre" className="label-field">Nombre *</label>
                <input id="categoria-nombre" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className="input-field" />
              </div>
              <div>
                <label htmlFor="categoria-descripcion" className="label-field">Descripción</label>
                <textarea id="categoria-descripcion" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="input-field" rows={3} />
              </div>
              <div>
                <label htmlFor="categoria-icono" className="label-field">Ícono</label>
                <input id="categoria-icono" value={form.icono} onChange={(event) => setForm({ ...form, icono: event.target.value })} className="input-field" />
              </div>
              {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
              <button type="submit" disabled={guardando} className="btn-primary w-full disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
