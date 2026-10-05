"use client";

import { FormEvent, useEffect, useState } from "react";
import { BriefcaseBusiness, Edit2, Mail, Phone, Search, Trash2, UserCog, X } from "lucide-react";
import CreateResourceModal from "@/components/forms/CreateResourceModal";
import { supabase } from "@/lib/supabase";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  rol: string;
  especialidad: string[] | null;
}

interface EmpleadoForm {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cargo: string;
  rol: string;
  especialidad: string;
  password: string;
}

const emptyForm: EmpleadoForm = { nombre: "", apellido: "", email: "", telefono: "", cargo: "", rol: "manicurista", especialidad: "", password: "" };

export default function EmpleadosPage() {
  const [search, setSearch] = useState("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState<EmpleadoForm>(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [empleadoEliminando, setEmpleadoEliminando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/empleados")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo cargar el equipo");
        setEmpleados(result.data || []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el equipo"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = empleados.filter((empleado) =>
    `${empleado.nombre} ${empleado.apellido} ${empleado.email || ""} ${empleado.cargo || ""} ${(empleado.especialidad || []).join(" ")}`.toLowerCase().includes(search.toLowerCase())
  );
  const roles = new Set(empleados.map((empleado) => empleado.rol).filter(Boolean)).size;
  const avatarColors = ["bg-brand-green text-white", "bg-brand-gold text-white", "bg-brand-cream text-brand-green"];

  const abrirEdicion = (empleado: Empleado) => {
    setEmpleadoEditando(empleado);
    setForm({
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      email: empleado.email || "",
      telefono: empleado.telefono || "",
      cargo: empleado.cargo || "",
      rol: empleado.rol,
      especialidad: (empleado.especialidad || []).join(", "),
      password: "",
    });
    setError("");
  };

  const guardarEdicion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empleadoEditando) return;
    setGuardando(true);
    setError("");
    const body: Record<string, string> = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      cargo: form.cargo.trim(),
      rol: form.rol,
      especialidad: form.especialidad.trim(),
    };
    if (form.password) body.password = form.password;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
      const response = await fetch(`/api/empleados/${empleadoEditando.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el empleado");
      setEmpleados((current) => current.map((item) => item.id === result.data.id ? result.data : item));
      setEmpleadoEditando(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar el empleado");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEmpleado = async (empleado: Empleado) => {
    if (!window.confirm(`¿Eliminar a ${empleado.nombre} ${empleado.apellido}? También se eliminará su cuenta de acceso.`)) return;

    setEmpleadoEliminando(empleado.id);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar el empleado");
      setEmpleados((current) => current.filter((item) => item.id !== empleado.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el empleado");
    } finally {
      setEmpleadoEliminando(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-gold">Personas</p>
          <h1 className="font-display text-3xl font-bold text-brand-green">Nuestro equipo</h1>
          <p className="text-brand-text-light">Gestiona los perfiles y especialidades del salón.</p>
        </div>
        <CreateResourceModal title="Empleado" endpoint="/api/empleados" includeAuthToken fields={[{ name: "nombre", label: "Nombre", required: true }, { name: "apellido", label: "Apellido", required: true }, { name: "telefono", label: "Teléfono" }, { name: "email", label: "Email de acceso", type: "email", required: true }, { name: "password", label: "Contraseña (mínimo 8 caracteres)", type: "password", required: true }, { name: "cargo", label: "Cargo" }, { name: "rol", label: "Rol", options: ["manicurista", "recepcionista", "admin"] }, { name: "especialidad", label: "Especialidad" }]} onCreated={() => window.location.reload()} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-brand-green/10 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green"><UserCog size={19} /></div>
            <div><p className="text-lg font-bold text-brand-text">{empleados.length}</p><p className="text-xs text-brand-text-light">Personas en el equipo</p></div>
          </div>
          <div className="h-9 w-px bg-brand-green/10" />
          <div className="text-sm text-brand-text-light">{roles} {roles === 1 ? "rol" : "roles"} en el equipo</div>
        </div>
        <label className="flex w-full sm:max-w-xs items-center gap-2 rounded-lg border border-brand-green/10 bg-white px-3 py-2.5 focus-within:border-brand-green/40 focus-within:ring-2 focus-within:ring-brand-green/10">
          <Search size={17} className="shrink-0 text-brand-text-light" />
          <input type="search" placeholder="Buscar por nombre..." value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-text-light/70" />
        </label>
      </div>

      {error && !empleadoEditando && <p className="text-sm text-red-600">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-brand-text-light">Cargando equipo...</p> : filtered.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((empleado, index) => (
          <article key={empleado.id} className="group overflow-hidden rounded-lg border border-brand-green/10 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-green/25 hover:shadow-bento">
            <div className="h-1 bg-gradient-to-r from-brand-green via-brand-green/70 to-brand-gold" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[index % avatarColors.length]}`}>
                    {empleado.nombre.charAt(0)}{empleado.apellido.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-brand-text">{empleado.nombre} {empleado.apellido}</h2>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-brand-text-light">{empleado.rol.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-brand-green/10 pt-4 text-sm text-brand-text-light">
                {empleado.cargo && <p className="flex items-center gap-2"><UserCog size={15} className="shrink-0 text-brand-gold" />{empleado.cargo}</p>}
                <p className="flex items-center gap-2"><BriefcaseBusiness size={15} className="shrink-0 text-brand-gold" />{empleado.especialidad?.length ? empleado.especialidad.join(", ") : "Sin especialidad registrada"}</p>
                {empleado.email && <p className="flex items-center gap-2 truncate"><Mail size={15} className="shrink-0 text-brand-gold" /><span className="truncate">{empleado.email}</span></p>}
                {empleado.telefono && <p className="flex items-center gap-2"><Phone size={15} className="shrink-0 text-brand-gold" />{empleado.telefono}</p>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => abrirEdicion(empleado)} aria-label={`Editar ${empleado.nombre} ${empleado.apellido}`} className="flex items-center justify-center gap-2 rounded-md border border-brand-green/15 px-3 py-2 text-sm font-medium text-brand-green transition-colors hover:bg-brand-green hover:text-white">
                  <Edit2 size={15} />Editar perfil
                </button>
                <button type="button" onClick={() => eliminarEmpleado(empleado)} disabled={empleadoEliminando === empleado.id} aria-label={`Eliminar ${empleado.nombre} ${empleado.apellido}`} className="flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                  <Trash2 size={15} />{empleadoEliminando === empleado.id ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div> : <div className="py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><Search size={20} /></div>
        <p className="mt-3 font-medium text-brand-text">{empleados.length ? "No encontramos empleados" : "Aún no hay empleados registrados"}</p>
        {empleados.length > 0 && <p className="mt-1 text-sm text-brand-text-light">Prueba con otro nombre.</p>}
      </div>}

      {empleadoEditando && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-bento">
          <div className="flex items-center justify-between border-b border-brand-cream-dark p-6">
            <h2 className="font-display text-xl font-bold">Editar empleado</h2>
            <button type="button" onClick={() => setEmpleadoEditando(null)} className="rounded-lg p-2 hover:bg-brand-cream" aria-label="Cerrar"><X size={20} /></button>
          </div>
          <form onSubmit={guardarEdicion} className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label-field">Nombre *</label><input required className="input-field" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></div>
              <div><label className="label-field">Apellido *</label><input required className="input-field" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} /></div>
            </div>
            <div><label className="label-field">Email</label><input type="email" className="input-field" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label-field">Teléfono</label><input className="input-field" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></div>
              <div><label className="label-field">Cargo</label><input className="input-field" value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="label-field">Rol *</label><select required className="input-field" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}><option value="manicurista">Manicurista</option><option value="recepcionista">Recepcionista</option><option value="admin">Administrador</option></select></div>
              <div><label className="label-field">Especialidad</label><input className="input-field" value={form.especialidad} onChange={(event) => setForm({ ...form, especialidad: event.target.value })} /></div>
            </div>
            <div><label className="label-field">Nueva contraseña (opcional)</label><input type="password" minLength={8} autoComplete="new-password" className="input-field" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><p className="mt-1 text-xs text-brand-text-light">Déjala vacía para conservar la actual.</p></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={guardando} className="btn-primary w-full">{guardando ? "Guardando..." : "Guardar cambios"}</button>
          </form>
        </div>
      </div>}
    </div>
  );
}
