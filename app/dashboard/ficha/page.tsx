"use client";

import StatsCard from "@/components/bento/StatCard";
import Card from "@/components/bento/Card";
import { User, Calendar, Phone, Mail } from "lucide-react";

export default function FichaPage() {
  const id = "1";

  const citas = [
    { fecha: "2026-09-24", hora: "10:00", servicio: "Manicura", estado: "confirmada", total: "S/ 35.00" },
    { fecha: "2026-09-15", hora: "11:30", servicio: "Pedicura", estado: "completada", total: "S/ 40.00" },
    { fecha: "2026-09-01", hora: "14:00", servicio: "Diseño de Uñas", estado: "completada", total: "S/ 120.00" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-green">Ficha de Cliente</h1>
        <p className="text-brand-text-light mt-1">ID: {id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                ML
              </div>
              <h2 className="font-display text-xl font-bold">María López</h2>
              <p className="text-sm text-brand-text-light">Cliente Activo desde 2026</p>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-brand-green" />
                <span className="text-sm">999888777</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-brand-green" />
                <span className="text-sm">maria@email.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-brand-green" />
                <span className="text-sm">Nac: 15/05/1990</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-bold mb-2">Resumen</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-text-light">Visitas</span>
                <span className="font-bold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-light">Total Gastado</span>
                <span className="font-bold text-brand-green">S/ 450.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-text-light">Próxima Cita</span>
                <span className="font-bold">24/09 10:00</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Historial de Citas">
            <div className="space-y-3">
              {citas.map((cita, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-brand-cream">
                  <div className="flex-1">
                    <p className="font-medium">{cita.servicio}</p>
                    <p className="text-sm text-brand-text-light">{cita.fecha} a las {cita.hora}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{cita.estado}</span>
                  <span className="font-bold text-brand-green">{cita.total}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
