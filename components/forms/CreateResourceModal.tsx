"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Field { name: string; label: string; type?: string; required?: boolean; options?: string[]; }
interface Props { title: string; endpoint: string; fields: Field[]; onCreated?: () => void; includeAuthToken?: boolean; }

export default function CreateResourceModal({ title, endpoint, fields, onCreated, includeAuthToken = false }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const body = Object.fromEntries(Object.entries(values).map(([key, value]) => {
      const field = fields.find((item) => item.name === key);
      return [key, field?.type === "number" ? Number(value) : value];
    }));
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (includeAuthToken) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Tu sesión venció. Inicia sesión nuevamente.");
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar");
      setValues({}); setOpen(false); onCreated?.();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo guardar"); }
    finally { setLoading(false); }
  };

  return <>
    <button className="btn-primary flex items-center gap-2" onClick={() => setOpen(true)}><Plus size={18} /> Nuevo {title}</button>
    {open && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-bento w-full max-w-md max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between p-6 border-b border-brand-cream-dark"><h2 className="font-display text-xl font-bold">Nuevo {title}</h2><button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-brand-cream"><X size={20} /></button></div><form onSubmit={submit} className="p-6 space-y-4">{fields.map((field) => <div key={field.name}><label className="label-field">{field.label}{field.required ? " *" : ""}</label>{field.options ? <select required={field.required} className="input-field" value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}><option value="">Seleccionar</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={field.required} type={field.type || "text"} className="input-field" value={values[field.name] || ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}</div>)}{error && <p className="text-sm text-red-500">{error}</p>}<button className="btn-primary w-full" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button></form></div></div>}
  </>;
}
