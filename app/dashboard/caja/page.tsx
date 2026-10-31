"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Calculator, ChevronRight, Plus, Wallet, X } from "lucide-react";
import StatsCard from "@/components/bento/StatCard";
import { useSupabase } from "@/components/layout/SupabaseProvider";

interface Adicional { id: string; concepto: string; monto: string; }
interface PagoDetalle {
  subtotal: number;
  descuento: number;
  total: number;
  tipo_descuento: string;
  referencia: string | null;
  observaciones: string | null;
  adicionales: { concepto: string; monto: number }[];
  cita: {
    fecha: string;
    hora_inicio: string;
    nombre_invitado?: string | null;
    telefono_invitado?: string | null;
    clientes: { nombre: string; apellido: string } | null;
    servicios: { nombre: string } | null;
  } | null;
}
interface Movimiento {
  id: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  metodo_pago: string;
  created_at: string;
  referencia: string | null;
  observaciones: string | null;
  pago: PagoDetalle | null;
}
interface Cita { id: string; fecha: string; hora_inicio: string; total: number; estado: string; nombre_invitado?: string | null; telefono_invitado?: string | null; clientes: { nombre: string; apellido: string } | null; servicios: { nombre: string; precio: number } | null; }
interface Promocion { id: string; nombre: string; descuento: number; fecha_inicio: string | null; fecha_fin: string | null; }

const formatoMoneda = (valor: number) => `S/ ${Number(valor).toFixed(2)}`;

function DetalleMovimientoModal({ movimiento, onClose }: { movimiento: Movimiento; onClose: () => void }) {
  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const overflowPrevio = document.body.style.overflow;
    document.addEventListener("keydown", cerrarConEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onClose]);

  const pago = movimiento.pago;
  const adicionales = pago?.adicionales ?? [];
  const totalAdicionales = adicionales.reduce((total, item) => total + Number(item.monto), 0);
  const subtotalCita = pago ? Math.max(Number(pago.subtotal) - totalAdicionales, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-detail-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-bento"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-cream-dark p-5">
          <h2 id="movement-detail-title" className="font-display text-xl font-bold">Detalle del movimiento</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-xl hover:bg-brand-cream" aria-label="Cerrar detalle"><X size={20} /></button>
        </div>
        <dl className="space-y-3 p-5 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Concepto</dt><dd className="text-right font-medium">{movimiento.concepto}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Tipo</dt><dd className="text-right">{movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Monto</dt><dd className="text-right font-bold">{formatoMoneda(movimiento.monto)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Fecha</dt><dd className="text-right">{new Date(movimiento.created_at).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Método de pago</dt><dd className="text-right capitalize">{movimiento.metodo_pago}</dd></div>
          {movimiento.referencia && <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Referencia</dt><dd className="text-right">{movimiento.referencia}</dd></div>}

          {pago && (
            <>
              <div className="border-t border-brand-cream-dark pt-3 font-semibold">Detalle del cobro</div>
              {pago.cita ? (
                <>
                  <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Cliente</dt><dd className="text-right">{pago.cita.clientes ? `${pago.cita.clientes.nombre} ${pago.cita.clientes.apellido}` : pago.cita.nombre_invitado?.trim() || "No disponible"}</dd></div>
                  {!pago.cita.clientes && pago.cita.telefono_invitado && <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Teléfono</dt><dd className="text-right">{pago.cita.telefono_invitado}</dd></div>}
                  <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Servicio</dt><dd className="text-right">{pago.cita.servicios?.nombre || "Servicio registrado"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Fecha de la cita</dt><dd className="text-right">{new Date(`${pago.cita.fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "long" })} · {pago.cita.hora_inicio}</dd></div>
                </>
              ) : (
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Cita</dt><dd className="text-right">La cita ya no está disponible</dd></div>
              )}
              <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Subtotal de la cita</dt><dd className="text-right">{formatoMoneda(subtotalCita)}</dd></div>
              {adicionales.length > 0 && (
                <>
                  <div className="border-t border-brand-cream-dark pt-3 font-semibold">Adicionales</div>
                  {adicionales.map((item, index) => (
                    <div key={`${item.concepto}-${index}`} className="flex justify-between gap-4"><dt className="text-brand-text-light">{item.concepto}</dt><dd className="text-right">{formatoMoneda(item.monto)}</dd></div>
                  ))}
                </>
              )}
              <div className="flex justify-between gap-4 border-t border-brand-cream-dark pt-3"><dt className="text-brand-text-light">Subtotal</dt><dd className="text-right">{formatoMoneda(pago.subtotal)}</dd></div>
              {Number(pago.descuento) > 0 && <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Descuento</dt><dd className="text-right">- {formatoMoneda(pago.descuento)}</dd></div>}
              <div className="flex justify-between gap-4 font-semibold"><dt>Total pagado</dt><dd className="text-right">{formatoMoneda(pago.total)}</dd></div>
            </>
          )}

          {movimiento.observaciones && <div className="border-t border-brand-cream-dark pt-3"><dt className="text-brand-text-light">Observaciones</dt><dd className="mt-1">{movimiento.observaciones}</dd></div>}
        </dl>
      </section>
    </div>
  );
}

export default function CajaPage() {
  const { supabase, user, loading: sessionLoading, roleLoading } = useSupabase();
  const canManage = user?.role === "admin" || user?.role === "recepcionista";
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [selectedCita, setSelectedCita] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [descuento, setDescuento] = useState("0");
  const [tipoDescuento, setTipoDescuento] = useState("monto_fijo");
  const [promocion, setPromocion] = useState("");
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);
  const [movimientoDetalle, setMovimientoDetalle] = useState<Movimiento | null>(null);
  const [egreso, setEgreso] = useState({ concepto: "", monto: "", metodo_pago: "efectivo" });
  const [message, setMessage] = useState("");

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  const loadCaja = useCallback(async () => {
    const response = await fetch("/api/caja", { headers: await getAuthHeaders(), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo cargar caja");
    setMovimientos(result.movimientos || []);
    setCitas((result.citas || []).filter((cita: Cita) => cita.total > 0));
    setPromociones(result.promociones || []);
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!canManage) return;
    loadCaja().catch((error) => setMessage(error.message));
  }, [canManage, loadCaja]);
  useEffect(() => {
    const citaId = new URLSearchParams(window.location.search).get("cita");
    if (citaId) setSelectedCita(citaId);
  }, []);

  const ingresos = movimientos.filter((item) => item.tipo === "ingreso").reduce((total, item) => total + Number(item.monto), 0);
  const egresos = movimientos.filter((item) => item.tipo === "egreso").reduce((total, item) => total + Number(item.monto), 0);
  const cita = citas.find((item) => item.id === selectedCita);
  const subtotalAdicionales = adicionales.reduce((total, item) => total + (Number(item.monto) || 0), 0);
  const descuentoPromocion = cita && promocion
    ? (Number(cita.total) * (promociones.find((item) => item.id === promocion)?.descuento || 0)) / 100
    : 0;
  const descuentoManual = cita
    ? tipoDescuento === "porcentaje"
      ? (Number(cita.total) * (Number(descuento) || 0)) / 100
      : Number(descuento) || 0
    : 0;
  const totalDescuentos = descuentoPromocion + descuentoManual;
  const totalCobro = cita ? Number(cita.total) + subtotalAdicionales - totalDescuentos : 0;

  const cobrar = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCita) return setMessage("Selecciona una cita pendiente de pago");
    if (adicionales.some((item) => !item.concepto.trim() || !Number.isFinite(Number(item.monto)) || Number(item.monto) <= 0)) return setMessage("Completa el concepto y un monto mayor a cero para cada adicional");
    if (totalDescuentos > Number(cita?.total || 0)) return setMessage("El descuento no puede superar el precio de la cita");
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) }, body: JSON.stringify({ id_cita: selectedCita, metodo_pago: metodo, descuento_manual: Number(descuento), tipo_descuento: tipoDescuento, id_promocion: promocion || null, adicionales: adicionales.map(({ concepto, monto }) => ({ concepto: concepto.trim(), monto: Number(monto) })) }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el cobro");
    setMessage(`Cobro registrado: ${formatoMoneda(result.data.total)}`);
    setSelectedCita(""); setDescuento("0"); setPromocion(""); setAdicionales([]); await loadCaja();
  };

  const registrarEgreso = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) }, body: JSON.stringify({ tipo: "egreso", ...egreso }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el egreso");
    setMessage("Egreso registrado"); setEgreso({ concepto: "", monto: "", metodo_pago: "efectivo" }); await loadCaja();
  };

  if (sessionLoading || roleLoading) return <div className="bento-card text-sm text-brand-text-light">Verificando permisos…</div>;
  if (!canManage) return <div className="bento-card"><h1 className="font-display text-3xl font-bold text-brand-green">Caja</h1><p className="mt-2 text-sm leading-6 text-brand-text-light">Tu rol no tiene permiso para cobrar ni registrar movimientos. Pide a un administrador que te asigne el rol de recepción.</p></div>;

  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold text-brand-green">Caja</h1><p className="text-brand-text-light mt-1">Cobra citas y controla ingresos y egresos</p></div>
    {message && <div className="bento-card text-sm text-brand-green">{message}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatsCard icon={ArrowUpCircle} label="Ingresos" value={formatoMoneda(ingresos)} color="text-green-600" /><StatsCard icon={ArrowDownCircle} label="Egresos" value={formatoMoneda(egresos)} color="text-red-600" /><StatsCard icon={Calculator} label="Balance" value={formatoMoneda(ingresos - egresos)} /><StatsCard icon={Wallet} label="Movimientos" value={movimientos.length} /></div>

    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={cobrar} className="bento-card space-y-4"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Cobrar cita</h2><span className="text-xs text-brand-text-light">Ingreso automático</span></div>
        <select required className="input-field" value={selectedCita} onChange={(event) => setSelectedCita(event.target.value)}><option value="">Seleccionar cita</option>{citas.map((item) => <option key={item.id} value={item.id}>{item.fecha} {item.hora_inicio} - {item.clientes ? `${item.clientes.nombre} ${item.clientes.apellido}` : item.nombre_invitado || "Invitado"} - {formatoMoneda(item.total)}</option>)}</select>
        {cita && <div className="rounded-xl bg-brand-cream p-3 text-sm">Subtotal de la cita: <strong>{formatoMoneda(cita.total)}</strong><br />Servicio: {cita.servicios?.nombre || "Servicio registrado"}{adicionales.length > 0 && <div className="mt-2 space-y-1 border-t border-brand-cream-dark pt-2">{adicionales.map((item) => <p key={item.id} className="flex justify-between gap-2"><span>{item.concepto || "Adicional"}</span><span>{formatoMoneda(Number(item.monto) || 0)}</span></p>)}</div>}<div className="mt-2 border-t border-brand-cream-dark pt-2"><p className="flex justify-between"><span>Descuento</span><span>- {formatoMoneda(totalDescuentos)}</span></p><p className="mt-1 flex justify-between text-base"><strong>Total a cobrar</strong><strong>{formatoMoneda(totalCobro)}</strong></p><p className="mt-1 text-xs text-brand-text-light">Los descuentos se aplican solo al precio de la cita.</p></div></div>}
        <div className="space-y-2">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Adicionales</h3><p className="text-xs text-brand-text-light">Agrega productos o servicios extra al cobro.</p></div><button type="button" onClick={() => setAdicionales((items) => [...items, { id: crypto.randomUUID(), concepto: "", monto: "" }])} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-green"><Plus size={16} /> Agregar</button></div>
          {adicionales.map((item) => <div key={item.id} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2"><input className="input-field" aria-label="Concepto adicional" placeholder="Concepto" value={item.concepto} onChange={(event) => setAdicionales((items) => items.map((current) => current.id === item.id ? { ...current, concepto: event.target.value } : current))} /><input className="input-field" aria-label="Monto adicional" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="S/ monto" value={item.monto} onChange={(event) => setAdicionales((items) => items.map((current) => current.id === item.id ? { ...current, monto: event.target.value } : current))} /><button type="button" onClick={() => setAdicionales((items) => items.filter((current) => current.id !== item.id))} className="min-h-11 min-w-11 rounded-xl text-brand-text-light hover:bg-brand-cream" aria-label={`Quitar ${item.concepto || "adicional"}`}><X size={18} /></button></div>)}
        </div>
        <div className="grid grid-cols-2 gap-3"><select className="input-field" value={metodo} onChange={(event) => setMetodo(event.target.value)}><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="plin">Plin</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select><select className="input-field" value={promocion} onChange={(event) => setPromocion(event.target.value)}><option value="">Sin promoción</option>{promociones.map((item) => <option key={item.id} value={item.id}>{item.nombre} (-{item.descuento}%)</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><input type="number" min="0" step="0.01" className="input-field" placeholder="Descuento manual" value={descuento} onChange={(event) => setDescuento(event.target.value)} /><select className="input-field" value={tipoDescuento} onChange={(event) => setTipoDescuento(event.target.value)}><option value="monto_fijo">S/ fijo</option><option value="porcentaje">Porcentaje</option></select></div>
        <button className="btn-primary w-full" type="submit">Registrar pago y movimiento</button>
      </form>

      <form onSubmit={registrarEgreso} className="bento-card space-y-4"><h2 className="font-display text-lg font-bold">Registrar egreso</h2><input required className="input-field" placeholder="Concepto (compra, alquiler...)" value={egreso.concepto} onChange={(event) => setEgreso({ ...egreso, concepto: event.target.value })} /><div className="grid grid-cols-2 gap-3"><input required type="number" min="0.01" step="0.01" className="input-field" placeholder="Monto" value={egreso.monto} onChange={(event) => setEgreso({ ...egreso, monto: event.target.value })} /><select className="input-field" value={egreso.metodo_pago} onChange={(event) => setEgreso({ ...egreso, metodo_pago: event.target.value })}><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div><button className="btn-secondary w-full" type="submit"><Plus size={18} /> Guardar egreso</button></form>
    </div>

    <div className="bento-card p-0 overflow-hidden"><div className="p-4 border-b border-brand-cream-dark"><h2 className="font-display text-lg font-bold">Movimientos</h2><p className="text-xs text-brand-text-light">Toca un movimiento para ver su detalle.</p></div><div className="divide-y divide-brand-cream">{movimientos.map((mov) => <button key={mov.id} type="button" onClick={() => setMovimientoDetalle(mov)} aria-label={`Ver detalle: ${mov.concepto}, ${formatoMoneda(mov.monto)}`} className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-brand-cream/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mov.tipo === "ingreso" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{mov.tipo === "ingreso" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}</span><span className="flex-1"><span className="block font-medium">{mov.concepto}</span><span className="block text-xs text-brand-text-light">{new Date(mov.created_at).toLocaleString("es-PE")} · {mov.metodo_pago}</span></span><span className={`shrink-0 font-bold ${mov.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>{mov.tipo === "ingreso" ? "+" : "-"}{formatoMoneda(mov.monto)}</span><ChevronRight size={18} className="shrink-0 text-brand-text-light" /></button>)}</div></div>

    {movimientoDetalle && <DetalleMovimientoModal movimiento={movimientoDetalle} onClose={() => setMovimientoDetalle(null)} />}
  </div>;
}
