"use client";

import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, User } from "lucide-react";
import StatsCard from "@/components/bento/StatCard";
import CreateResourceModal from "@/components/forms/CreateResourceModal";

interface Cliente { id: string; nombre: string; apellido: string; telefono: string | null; email: string | null; }

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clientes").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setClientes(result.data || []); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los clientes"));
  }, []);

  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-green">Clientes</h1>
          <p className="text-brand-text-light mt-1">Gestiona tu base de datos de clientes</p>
        </div>
        <CreateResourceModal title="Cliente" endpoint="/api/clientes" fields={[{ name: "nombre", label: "Nombre", required: true }, { name: "apellido", label: "Apellido", required: true }, { name: "telefono", label: "Teléfono", required: true }, { name: "email", label: "Email", type: "email" }]} onCreated={() => window.location.reload()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <StatsCard icon={User} label="Total Clientes" value={clientes.length} />
      </div>

      <div className="bento-card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="text-brand-text-light" size={20} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field border-none shadow-none focus:shadow-none p-0"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="grid gap-3">
          {filtered.map((cliente) => (
            <div key={cliente.id} className="flex items-center gap-4 p-4 rounded-xl bg-brand-cream hover:bg-brand-cream-dark transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-brand-green flex items-center justify-center text-white font-bold">
                {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{cliente.nombre} {cliente.apellido}</p>
                <p className="text-sm text-brand-text-light">{cliente.telefono || cliente.email || "Sin contacto"}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-medium text-brand-green">Cliente registrado</p>
                <p className="text-xs text-brand-text-light">{cliente.email || "Sin email"}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-xl hover:bg-brand-green/10 text-brand-green">
                  <Edit2 size={16} />
                </button>
                <button className="p-2 rounded-xl hover:bg-red-50 text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
