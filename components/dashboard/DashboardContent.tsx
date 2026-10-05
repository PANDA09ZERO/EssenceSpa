"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Cita, Cliente, Servicio } from "@/lib/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";

export default function DashboardContent() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: citasData } = await supabase.from("citas").select("*").order("fecha", { ascending: true }).limit(10);
    const { data: clientesData } = await supabase.from("clientes").select("*").limit(5);
    const { data: serviciosData } = await supabase.from("servicios").select("*").limit(5);
    setCitas(citasData || []);
    setClientes(clientesData || []);
    setServicios(serviciosData || []);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {citas.map((cita) => (
        <div key={cita.id_cita} className="bento-card cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-semibold">
              {cita.cliente_nombre?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-semibold">{cita.cliente_nombre}</p>
              <p className="text-xs text-brand-text-light">{cita.servicio_nombre}</p>
            </div>
          </div>
          <p className="text-sm text-brand-text-light">{formatDateTime(cita.fecha + "T" + cita.hora_inicio)}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
            cita.estado === "confirmada" ? "bg-green-100 text-green-700" :
            cita.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {cita.estado}
          </span>
        </div>
      ))}
    </div>
  );
}
