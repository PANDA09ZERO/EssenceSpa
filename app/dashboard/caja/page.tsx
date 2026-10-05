"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Calculator, Plus, Wallet } from "lucide-react";
import StatsCard from "@/components/bento/StatCard";

interface Movimiento { id: string; tipo: "ingreso" | "egreso"; concepto: string; monto: number; metodo_pago: string; created_at: string; }
interface Cita { id: string; fecha: string; hora_inicio: string; total: number; estado: string; clientes: { nombre: string; apellido: string } | null; servicios: { nombre: string; precio: number } | null; }
interface Promocion { id: string; nombre: string; descuento: number; fecha_inicio: string | null; fecha_fin: string | null; }

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [selectedCita, setSelectedCita] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [descuento, setDescuento] = useState("0");
  const [tipoDescuento, setTipoDescuento] = useState("monto_fijo");
  const [promocion, setPromocion] = useState("");
  const [egreso, setEgreso] = useState({ concepto: "", monto: "", metodo_pago: "efectivo" });
  const [message, setMessage] = useState("");

  const loadCaja = async () => {
    const response = await fetch("/api/caja");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo cargar caja");
    setMovimientos(result.movimientos || []);
    setCitas((result.citas || []).filter((cita: Cita) => cita.total > 0));
    setPromociones(result.promociones || []);
  };

  useEffect(() => { loadCaja().catch((error) => setMessage(error.message)); }, []);
  useEffect(() => {
    const citaId = new URLSearchParams(window.location.search).get("cita");
    if (citaId) setSelectedCita(citaId);
  }, []);

  const ingresos = movimientos.filter((item) => item.tipo === "ingreso").reduce((total, item) => total + Number(item.monto), 0);
  const egresos = movimientos.filter((item) => item.tipo === "egreso").reduce((total, item) => total + Number(item.monto), 0);
  const cita = citas.find((item) => item.id === selectedCita);

  const cobrar = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCita) return setMessage("Selecciona una cita pendiente de pago");
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_cita: selectedCita, metodo_pago: metodo, descuento_manual: Number(descuento), tipo_descuento: tipoDescuento, id_promocion: promocion || null }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el cobro");
    setMessage(`Cobro registrado: S/ ${Number(result.data.total).toFixed(2)}`);
    setSelectedCita(""); setDescuento("0"); setPromocion(""); await loadCaja();
  };

  const registrarEgreso = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "egreso", ...egreso }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el egreso");
    setMessage("Egreso registrado"); setEgreso({ concepto: "", monto: "", metodo_pago: "efectivo" }); await loadCaja();
  };

  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold text-brand-green">Caja</h1><p className="text-brand-text-light mt-1">Cobra citas y controla ingresos y egresos</p></div>
    {message && <div className="bento-card text-sm text-brand-green">{message}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatsCard icon={ArrowUpCircle} label="Ingresos" value={`S/ ${ingresos.toFixed(2)}`} color="text-green-600" /><StatsCard icon={ArrowDownCircle} label="Egresos" value={`S/ ${egresos.toFixed(2)}`} color="text-red-600" /><StatsCard icon={Calculator} label="Balance" value={`S/ ${(ingresos - egresos).toFixed(2)}`} /><StatsCard icon={Wallet} label="Movimientos" value={movimientos.length} /></div>

    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={cobrar} className="bento-card space-y-4"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Cobrar cita</h2><span className="text-xs text-brand-text-light">Ingreso automático</span></div>
        <select required className="input-field" value={selectedCita} onChange={(event) => setSelectedCita(event.target.value)}><option value="">Seleccionar cita</option>{citas.map((item) => <option key={item.id} value={item.id}>{item.fecha} {item.hora_inicio} - {item.clientes?.nombre} {item.clientes?.apellido} - S/ {Number(item.total).toFixed(2)}</option>)}</select>
        {cita && <div className="rounded-xl bg-brand-cream p-3 text-sm">Subtotal: <strong>S/ {Number(cita.total).toFixed(2)}</strong><br />Servicio: {cita.servicios?.nombre || "Servicio registrado"}</div>}
        <div className="grid grid-cols-2 gap-3"><select className="input-field" value={metodo} onChange={(event) => setMetodo(event.target.value)}><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="plin">Plin</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select><select className="input-field" value={promocion} onChange={(event) => setPromocion(event.target.value)}><option value="">Sin promoción</option>{promociones.map((item) => <option key={item.id} value={item.id}>{item.nombre} (-{item.descuento}%)</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><input type="number" min="0" step="0.01" className="input-field" placeholder="Descuento manual" value={descuento} onChange={(event) => setDescuento(event.target.value)} /><select className="input-field" value={tipoDescuento} onChange={(event) => setTipoDescuento(event.target.value)}><option value="monto_fijo">S/ fijo</option><option value="porcentaje">Porcentaje</option></select></div>
        <button className="btn-primary w-full" type="submit">Registrar pago y movimiento</button>
      </form>

      <form onSubmit={registrarEgreso} className="bento-card space-y-4"><h2 className="font-display text-lg font-bold">Registrar egreso</h2><input required className="input-field" placeholder="Concepto (compra, alquiler...)" value={egreso.concepto} onChange={(event) => setEgreso({ ...egreso, concepto: event.target.value })} /><div className="grid grid-cols-2 gap-3"><input required type="number" min="0.01" step="0.01" className="input-field" placeholder="Monto" value={egreso.monto} onChange={(event) => setEgreso({ ...egreso, monto: event.target.value })} /><select className="input-field" value={egreso.metodo_pago} onChange={(event) => setEgreso({ ...egreso, metodo_pago: event.target.value })}><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div><button className="btn-secondary w-full" type="submit"><Plus size={18} /> Guardar egreso</button></form>
    </div>

    <div className="bento-card p-0 overflow-hidden"><div className="p-4 border-b border-brand-cream-dark"><h2 className="font-display text-lg font-bold">Movimientos</h2></div><div className="divide-y divide-brand-cream">{movimientos.map((mov) => <div key={mov.id} className="flex items-center gap-4 p-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mov.tipo === "ingreso" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{mov.tipo === "ingreso" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}</div><div className="flex-1"><p className="font-medium">{mov.concepto}</p><p className="text-xs text-brand-text-light">{new Date(mov.created_at).toLocaleString("es-PE")} · {mov.metodo_pago}</p></div><span className={`font-bold ${mov.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>{mov.tipo === "ingreso" ? "+" : "-"}S/ {Number(mov.monto).toFixed(2)}</span></div>)}</div></div>
  </div>;
}
