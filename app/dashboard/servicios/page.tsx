"use client";

import { FormEvent, useEffect, useState } from "react";
import { Clock, DollarSign, Edit2, Filter, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  duracion: number;
  imagen: string | null;
  icono: string | null;
  estado: "activo" | "inactivo";
}

interface Categoria {
  nombre: string;
}

interface ServicioForm {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  duracion: string;
  imagen: string;
}

const emptyForm: ServicioForm = { nombre: "", descripcion: "", categoria: "", precio: "", duracion: "", imagen: "" };

export default function ServiciosPage() {
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState<ServicioForm>(emptyForm);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState("");

  useEffect(() => {
    if (!imagenSeleccionada) {
      setImagenPreview(form.imagen);
      return;
    }

    const objectUrl = URL.createObjectURL(imagenSeleccionada);
    setImagenPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imagenSeleccionada, form.imagen]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [serviciosResponse, categoriasResponse] = await Promise.all([
          fetch("/api/servicios"),
          fetch("/api/categorias"),
        ]);
        const [serviciosResult, categoriasResult] = await Promise.all([
          serviciosResponse.json(),
          categoriasResponse.json(),
        ]);
        if (!serviciosResponse.ok) throw new Error(serviciosResult.error || "No se pudieron cargar los servicios");
        if (!categoriasResponse.ok) throw new Error(categoriasResult.error || "No se pudieron cargar las categorías");
        const serviciosCargados: Servicio[] = serviciosResult.data || [];
        const categoriasCargadas: Categoria[] = categoriasResult.data || [];
        const nombresCategorias = new Set([
          ...categoriasCargadas.map((item) => item.nombre),
          ...serviciosCargados.map((item) => item.categoria).filter(Boolean),
        ]);
        setServicios(serviciosCargados);
        setCategoriasDisponibles(Array.from(nombresCategorias, (nombre) => ({ nombre })));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const abrirFormulario = (servicio?: Servicio) => {
    setServicioEditando(servicio || null);
    setForm(servicio ? {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      categoria: servicio.categoria || "",
      precio: String(servicio.precio),
      duracion: String(servicio.duracion),
      imagen: servicio.imagen || "",
    } : emptyForm);
    setImagenSeleccionada(null);
    setFormError("");
    setModalAbierto(true);
  };

  const seleccionarImagen = (file?: File) => {
    setFormError("");
    if (!file) {
      setImagenSeleccionada(null);
      setForm({ ...form, imagen: "" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFormError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("La imagen debe pesar menos de 5 MB.");
      return;
    }
    setImagenSeleccionada(file);
  };

  const guardarServicio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGuardando(true);
    setFormError("");
    let imagen = form.imagen.trim() || null;

    try {
      if (imagenSeleccionada) {
        const extension = imagenSeleccionada.name.includes(".") ? imagenSeleccionada.name.split(".").pop()?.toLowerCase() : "";
        const rutaImagen = `${crypto.randomUUID()}${extension && /^[a-z0-9]{1,8}$/.test(extension) ? `.${extension}` : ""}`;
        const { error: uploadError } = await supabase.storage.from("servicios").upload(rutaImagen, imagenSeleccionada, {
          cacheControl: "3600",
          contentType: imagenSeleccionada.type,
          upsert: false,
        });
        if (uploadError) throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
        imagen = supabase.storage.from("servicios").getPublicUrl(rutaImagen).data.publicUrl;
      }

      const body = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria: form.categoria,
      precio: Number(form.precio),
      duracion: Number(form.duracion),
      imagen,
      };

      const response = await fetch(servicioEditando ? `/api/servicios/${servicioEditando.id}` : "/api/servicios", {
        method: servicioEditando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el servicio");
      setModalAbierto(false);
      window.location.reload();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "No se pudo guardar el servicio");
    } finally {
      setGuardando(false);
    }
  };

  const categorias = ["Todas", ...Array.from(new Set(servicios.map((servicio) => servicio.categoria).filter(Boolean)))];
  const filtered = servicios.filter((servicio) => {
    const matchSearch = servicio.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = categoria === "Todas" || servicio.categoria === categoria;
    return matchSearch && matchCategoria;
  });

  const stats = {
    total: servicios.length,
    activos: servicios.filter((servicio) => servicio.estado === "activo").length,
    categorias: Math.max(categorias.length - 1, 0),
    avgPrecio: servicios.length
      ? (servicios.reduce((total, servicio) => total + Number(servicio.precio), 0) / servicios.length).toFixed(0)
      : "0",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-green">Servicios</h1>
          <p className="text-brand-text-light mt-1">Administra los servicios de tu salón</p>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2" onClick={() => abrirFormulario()}><Plus size={18} /> Nuevo Servicio</button>
      </div>

      {modalAbierto && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-bento w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-brand-cream-dark">
            <h2 className="font-display text-xl font-bold">{servicioEditando ? "Editar servicio" : "Nuevo servicio"}</h2>
            <button type="button" onClick={() => setModalAbierto(false)} className="p-2 rounded-xl hover:bg-brand-cream" aria-label="Cerrar"><X size={20} /></button>
          </div>
          <form onSubmit={guardarServicio} className="p-6 space-y-4">
            <div><label className="label-field">Nombre *</label><input required className="input-field" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></div>
            <div><label className="label-field">Descripción</label><textarea className="input-field min-h-20" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></div>
            <div><label className="label-field">Categoría *</label><select required className="input-field" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}><option value="">Seleccionar categoría</option>{categoriasDisponibles.map((item) => <option key={item.nombre} value={item.nombre}>{item.nombre}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-field">Precio *</label><input required min="0" step="0.01" type="number" className="input-field" value={form.precio} onChange={(event) => setForm({ ...form, precio: event.target.value })} /></div>
              <div><label className="label-field">Duración (minutos) *</label><input required min="1" step="1" type="number" className="input-field" value={form.duracion} onChange={(event) => setForm({ ...form, duracion: event.target.value })} /></div>
            </div>
            <div>
              <label className="label-field">Imagen de referencia (opcional)</label>
              <input type="file" accept="image/*" className="input-field file:mr-3 file:rounded-md file:border-0 file:bg-brand-green/10 file:px-3 file:py-2 file:text-brand-green" onChange={(event) => seleccionarImagen(event.target.files?.[0])} />
              {imagenPreview && <div className="mt-3 flex items-center gap-3"><img src={imagenPreview} alt="Vista previa de la imagen del servicio" className="h-20 w-20 rounded-xl object-cover" /><button type="button" className="text-sm text-red-600" onClick={() => seleccionarImagen()}>Quitar imagen</button></div>}
              <p className="mt-1 text-xs text-brand-text-light">JPG, PNG, WebP u otro formato de imagen. Máximo 5 MB.</p>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <button className="btn-primary w-full" disabled={guardando || categoriasDisponibles.length === 0}>{guardando ? "Guardando..." : "Guardar servicio"}</button>
            {categoriasDisponibles.length === 0 && <p className="text-sm text-brand-text-light">Primero agrega una categoría para poder crear servicios.</p>}
          </form>
        </div>
      </div>}

      <div className="bento-grid-4">
        <div className="bento-card flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green"><Sparkles size={20} /></div><div><p className="font-display text-2xl font-bold text-brand-green">{stats.total}</p><p className="text-sm text-brand-text-light">Total Servicios</p></div></div>
        <div className="bento-card flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600"><Clock size={20} /></div><div><p className="font-display text-2xl font-bold text-green-600">{stats.activos}</p><p className="text-sm text-brand-text-light">Activos</p></div></div>
        <div className="bento-card flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold"><DollarSign size={20} /></div><div><p className="font-display text-2xl font-bold text-brand-gold">S/ {stats.avgPrecio}</p><p className="text-sm text-brand-text-light">Precio Promedio</p></div></div>
        <div className="bento-card flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600"><Filter size={20} /></div><div><p className="font-display text-2xl font-bold text-yellow-600">{stats.categorias}</p><p className="text-sm text-brand-text-light">Categorías</p></div></div>
      </div>

      <div className="bento-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-brand-cream rounded-xl px-4 py-3"><Search className="text-brand-text-light" size={20} /><input type="text" placeholder="Buscar servicio..." value={search} onChange={(event) => setSearch(event.target.value)} className="bg-transparent outline-none flex-1 text-brand-text" /></div>
          <div className="flex gap-2 flex-wrap">{categorias.map((cat) => <button key={cat} onClick={() => setCategoria(cat)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${categoria === cat ? "bg-brand-green text-white" : "bg-brand-green-light text-white hover:bg-brand-text-light"}`}>{cat}</button>)}</div>
        </div>
      </div>

      {loading && <div className="bento-card text-center text-brand-text-light">Cargando servicios...</div>}
      {error && <div className="bento-card text-center text-red-500">{error}</div>}
      {!loading && !error && filtered.length === 0 && <div className="bento-card text-center text-brand-text-light">No hay servicios que coincidan con tu búsqueda.</div>}
      {!loading && !error && filtered.length > 0 && <div className="bento-grid-3">{filtered.map((servicio) => <div key={servicio.id} className="bento-card group hover:scale-105 transition-transform">
        <div className="flex items-start justify-between mb-4">{servicio.imagen ? <img src={servicio.imagen} alt={`Referencia de ${servicio.nombre}`} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-green/20 to-brand-green/10 flex items-center justify-center text-3xl">{servicio.icono || "✨"}</div>}{servicio.estado === "activo" && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Activo</span>}</div>
        <h3 className="font-display text-lg font-bold mb-2">{servicio.nombre}</h3><p className="text-sm text-brand-text-light mb-2">{servicio.categoria}</p>{servicio.descripcion && <p className="text-sm text-brand-text-light mb-4 line-clamp-2">{servicio.descripcion}</p>}
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 text-brand-text-light"><Clock size={16} /><span className="text-sm">{servicio.duracion} min</span></div><div className="flex items-center gap-2 text-brand-green"><DollarSign size={16} /><span className="font-bold">S/ {Number(servicio.precio).toFixed(2)}</span></div></div>
        <div className="flex gap-2 pt-4 border-t border-gray-100"><button type="button" onClick={() => abrirFormulario(servicio)} className="flex-1 py-2 rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-colors flex items-center justify-center gap-2"><Edit2 size={16} /> Editar</button><button className="py-2 px-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors" aria-label={`Eliminar ${servicio.nombre}`}><Trash2 size={16} /></button></div>
      </div>)}</div>}
    </div>
  );
}
