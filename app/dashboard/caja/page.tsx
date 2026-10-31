"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Lock,
  LockOpen,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import StatsCard from "@/components/bento/StatCard";
import { useSupabase } from "@/components/layout/SupabaseProvider";
import { addDaysKey, daysBetweenKeys, formatDayLabel, formatShortDay, limaDateKey, limaTodayKey } from "@/lib/lima-time";

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
interface Cierre {
  id: string;
  fecha: string;
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  efectivo_esperado: number;
  efectivo_contado: number | null;
  diferencia: number | null;
  totales_metodo: Record<string, { ingresos: number; egresos: number }> | null;
  observaciones: string | null;
  cerrado_por_email: string | null;
  cerrado_por_nombre: string | null;
  created_at: string;
}
interface MetodoTotal { ingresos: number; egresos: number; }
interface DiaGrupo {
  fecha: string;
  items: Movimiento[];
  ingresos: number;
  egresos: number;
  balance: number;
  metodos: [string, MetodoTotal][];
}
interface ResumenPeriodo { ingresos: number; egresos: number; balance: number; movimientos: number; }

type Preset = "hoy" | "ayer" | "7d" | "mes" | "rango";

const formatoMoneda = (valor: number) => `S/ ${Number(valor).toFixed(2)}`;
const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

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

function CierreCajaModal({
  dia,
  cierre,
  onClose,
  onSaved,
  getAuthHeaders,
}: {
  dia: DiaGrupo;
  cierre: Cierre | null;
  onClose: () => void;
  onSaved: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
}) {
  const [contado, setContado] = useState(cierre?.efectivo_contado != null ? String(cierre.efectivo_contado) : "");
  const [observaciones, setObservaciones] = useState(cierre?.observaciones || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !guardando) onClose();
    };
    const overflowPrevio = document.body.style.overflow;
    document.addEventListener("keydown", cerrarConEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onClose, guardando]);

  const efectivoEsperado = useMemo(() => {
    const efectivo = dia.metodos.find(([metodo]) => metodo === "efectivo")?.[1];
    return (efectivo?.ingresos || 0) - (efectivo?.egresos || 0);
  }, [dia.metodos]);

  const contadoNum = contado.trim() === "" ? null : Number(contado);
  const diferencia = contadoNum !== null && Number.isFinite(contadoNum) ? contadoNum - efectivoEsperado : null;
  const cambioPosterior = cierre
    ? Math.abs(Number(cierre.total_ingresos) - dia.ingresos) > 0.009 || Math.abs(Number(cierre.total_egresos) - dia.egresos) > 0.009
    : false;

  const cerrarCaja = async (event: FormEvent) => {
    event.preventDefault();
    if (contadoNum !== null && (!Number.isFinite(contadoNum) || contadoNum < 0)) {
      setError("El efectivo contado debe ser un monto válido");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const response = await fetch("/api/caja/cierre", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
        body: JSON.stringify({ fecha: dia.fecha, efectivo_contado: contadoNum, observaciones: observaciones.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cerrar la caja");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la caja");
    } finally {
      setGuardando(false);
    }
  };

  const reabrirCaja = async () => {
    if (!window.confirm(`¿Reabrir la caja del ${formatShortDay(dia.fecha)}? Se borrará el cierre guardado y podrás volver a cerrarla.`)) return;
    setGuardando(true);
    setError("");
    try {
      const response = await fetch(`/api/caja/cierre?fecha=${dia.fecha}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo reabrir la caja");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir la caja");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={() => { if (!guardando) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cierre-caja-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-bento"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-cream-dark p-5">
          <div>
            <h2 id="cierre-caja-title" className="font-display text-xl font-bold">Cierre de caja</h2>
            <p className="text-xs text-brand-text-light">{formatDayLabel(dia.fecha)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className="min-h-11 min-w-11 rounded-xl hover:bg-brand-cream disabled:opacity-50" aria-label="Cerrar cierre de caja"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          {cierre ? (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-brand-green/10 px-3 py-2 text-xs font-semibold text-brand-green">
                <Lock size={15} /> Caja cerrada
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Ingresos del día</dt><dd className="font-medium text-green-600">{formatoMoneda(cierre.total_ingresos)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Egresos del día</dt><dd className="font-medium text-red-600">{formatoMoneda(cierre.total_egresos)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Balance</dt><dd className="font-semibold">{formatoMoneda(cierre.balance)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-brand-cream-dark pt-2"><dt className="text-brand-text-light">Efectivo esperado</dt><dd className="font-medium">{formatoMoneda(cierre.efectivo_esperado)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Efectivo contado</dt><dd className="font-medium">{cierre.efectivo_contado === null ? "No registrado" : formatoMoneda(cierre.efectivo_contado)}</dd></div>
                {cierre.diferencia !== null && (
                  <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Diferencia</dt><dd className={`font-semibold ${Number(cierre.diferencia) === 0 ? "text-brand-green" : Number(cierre.diferencia) > 0 ? "text-green-600" : "text-red-600"}`}>{Number(cierre.diferencia) > 0 ? "+" : ""}{formatoMoneda(cierre.diferencia)}</dd></div>
                )}
              </dl>
              {cierre.observaciones && <p className="rounded-xl bg-brand-cream p-3 text-xs leading-5 text-brand-text-light">{cierre.observaciones}</p>}
              <p className="text-xs text-brand-text-light">
                Cerrada por {cierre.cerrado_por_nombre || cierre.cerrado_por_email || "el equipo"} · {new Date(cierre.created_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {cambioPosterior && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  Hay movimientos registrados después del cierre. Los totales del día ya no coinciden con la foto guardada: reabre la caja y vuelve a cerrarla para actualizarla.
                </p>
              )}
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="button" onClick={reabrirCaja} disabled={guardando} className="btn-secondary w-full"><LockOpen size={17} /> {guardando ? "Reabriendo…" : "Reabrir caja"}</button>
            </>
          ) : (
            <form onSubmit={cerrarCaja} className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-light">Totales por método</h3>
                <ul className="mt-2 divide-y divide-brand-cream rounded-xl border border-brand-cream-dark">
                  {dia.metodos.map(([metodo, totales]) => (
                    <li key={metodo} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span>{ETIQUETAS_METODO[metodo] || metodo}</span>
                      <span className="text-right text-xs">
                        <span className="block text-green-600">+{formatoMoneda(totales.ingresos)}</span>
                        {totales.egresos > 0 && <span className="block text-red-600">−{formatoMoneda(totales.egresos)}</span>}
                      </span>
                    </li>
                  ))}
                  {dia.metodos.length === 0 && <li className="px-3 py-2 text-xs text-brand-text-light">Sin movimientos este día.</li>}
                </ul>
              </div>

              <dl className="space-y-2 rounded-xl bg-brand-cream p-3">
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Ingresos</dt><dd className="font-medium text-green-600">{formatoMoneda(dia.ingresos)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Egresos</dt><dd className="font-medium text-red-600">{formatoMoneda(dia.egresos)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-brand-text-light">Balance</dt><dd className="font-semibold">{formatoMoneda(dia.balance)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-brand-cream-dark pt-2"><dt className="text-brand-text-light">Efectivo esperado</dt><dd className="font-semibold">{formatoMoneda(efectivoEsperado)}</dd></div>
              </dl>

              <label className="block">
                <span className="label-field">Efectivo contado (opcional)</span>
                <input type="number" inputMode="decimal" min="0" step="0.01" className="input-field" placeholder="S/ monto contado en caja" value={contado} onChange={(event) => setContado(event.target.value)} />
              </label>
              {diferencia !== null && Number.isFinite(diferencia) && (
                <p className={`text-sm font-semibold ${Math.abs(diferencia) < 0.009 ? "text-brand-green" : diferencia > 0 ? "text-green-600" : "text-red-600"}`}>
                  Diferencia: {diferencia > 0 ? "+" : ""}{formatoMoneda(diferencia)}
                  <span className="ml-2 font-normal text-brand-text-light">{Math.abs(diferencia) < 0.009 ? "(cuadra)" : diferencia > 0 ? "(sobra)" : "(falta)"}</span>
                </p>
              )}
              <label className="block">
                <span className="label-field">Observaciones (opcional)</span>
                <textarea className="input-field min-h-20" maxLength={500} placeholder="Notas del cierre, faltantes, incidencias…" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
              </label>
              <p className="text-xs leading-5 text-brand-text-light">El cierre guarda una foto de los totales de este día. Si después registras otro movimiento, podrás reabrir y volver a cerrar.</p>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={guardando} className="btn-primary w-full">{guardando ? "Cerrando…" : "Cerrar caja del día"}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default function CajaPage() {
  const { supabase, user, loading: sessionLoading, roleLoading } = useSupabase();
  const canManage = user?.role === "admin" || user?.role === "recepcionista";

  const [hoy, setHoy] = useState(() => limaTodayKey());
  const [desde, setDesde] = useState(() => limaTodayKey());
  const [hasta, setHasta] = useState(() => limaTodayKey());
  const [preset, setPreset] = useState<Preset>("hoy");

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [cierresDisponibles, setCierresDisponibles] = useState(true);
  const [resumenAnterior, setResumenAnterior] = useState<ResumenPeriodo>({ ingresos: 0, egresos: 0, balance: 0, movimientos: 0 });
  const [cargando, setCargando] = useState(true);

  const [selectedCita, setSelectedCita] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [descuento, setDescuento] = useState("0");
  const [tipoDescuento, setTipoDescuento] = useState("monto_fijo");
  const [promocion, setPromocion] = useState("");
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);
  const [movimientoDetalle, setMovimientoDetalle] = useState<Movimiento | null>(null);
  const [cierreDia, setCierreDia] = useState<DiaGrupo | null>(null);
  const [diasColapsados, setDiasColapsados] = useState<string[]>([]);
  const [egreso, setEgreso] = useState({ concepto: "", monto: "", metodo_pago: "efectivo" });
  const [message, setMessage] = useState("");

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, [supabase]);

  // Evita que una respuesta antigua (de un rango anterior) pise a la actual.
  const loadSeq = useRef(0);

  const loadCaja = useCallback(async () => {
    const seq = ++loadSeq.current;
    const params = new URLSearchParams({ desde, hasta });
    const response = await fetch(`/api/caja?${params.toString()}`, { headers: await getAuthHeaders(), cache: "no-store" });
    const result = await response.json();
    if (seq !== loadSeq.current) return;
    if (!response.ok) throw new Error(result.error || "No se pudo cargar caja");
    setMovimientos(result.movimientos || []);
    setCitas((result.citas || []).filter((cita: Cita) => cita.total > 0));
    setPromociones(result.promociones || []);
    setCierres(result.cierres || []);
    setCierresDisponibles(result.cierresDisponibles !== false);
    setResumenAnterior(result.resumenAnterior || { ingresos: 0, egresos: 0, balance: 0, movimientos: 0 });
    if (result.hoy) setHoy(result.hoy);
  }, [desde, hasta, getAuthHeaders]);

  useEffect(() => {
    if (!canManage) return;
    setCargando(true);
    loadCaja()
      .catch((error) => setMessage(error.message))
      .finally(() => setCargando(false));
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

  const ayer = addDaysKey(hoy, -1);

  const etiquetaPeriodo = useMemo(() => {
    if (desde === hasta) {
      const prefijo = desde === hoy ? "Hoy" : desde === ayer ? "Ayer" : null;
      return `${prefijo ? `${prefijo} · ` : ""}${formatDayLabel(desde)}`;
    }
    return `${formatShortDay(desde)} – ${formatShortDay(hasta)}`;
  }, [desde, hasta, hoy, ayer]);

  const totalDias = daysBetweenKeys(desde, hasta) + 1;
  const anteriorHasta = addDaysKey(desde, -1);
  const anteriorDesde = addDaysKey(anteriorHasta, -(totalDias - 1));
  const etiquetaAnterior = desde === hasta
    ? `el día anterior (${formatShortDay(anteriorDesde)})`
    : `${formatShortDay(anteriorDesde)} – ${formatShortDay(anteriorHasta)}`;

  const variacion = resumenAnterior.ingresos > 0
    ? ((ingresos - resumenAnterior.ingresos) / resumenAnterior.ingresos) * 100
    : null;

  const dias = useMemo<DiaGrupo[]>(() => {
    const porFecha = new Map<string, Movimiento[]>();
    for (const movimiento of movimientos) {
      const fecha = limaDateKey(movimiento.created_at);
      const items = porFecha.get(fecha) || [];
      items.push(movimiento);
      porFecha.set(fecha, items);
    }
    return [...porFecha.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fecha, items]) => {
        let ingresosDia = 0;
        let egresosDia = 0;
        const metodos = new Map<string, MetodoTotal>();
        for (const movimiento of items) {
          const monto = Number(movimiento.monto) || 0;
          const total = metodos.get(movimiento.metodo_pago) || { ingresos: 0, egresos: 0 };
          if (movimiento.tipo === "ingreso") {
            ingresosDia += monto;
            total.ingresos += monto;
          } else {
            egresosDia += monto;
            total.egresos += monto;
          }
          metodos.set(movimiento.metodo_pago, total);
        }
        return {
          fecha,
          items,
          ingresos: ingresosDia,
          egresos: egresosDia,
          balance: ingresosDia - egresosDia,
          metodos: [...metodos.entries()].sort((a, b) => (b[1].ingresos + b[1].egresos) - (a[1].ingresos + a[1].egresos)),
        };
      });
  }, [movimientos]);

  const cierrePorFecha = useMemo(() => new Map(cierres.map((cierre) => [cierre.fecha, cierre])), [cierres]);

  const etiquetaDia = (fecha: string) => (fecha === hoy ? "Hoy" : fecha === ayer ? "Ayer" : "");

  const aplicarPreset = (valor: Preset) => {
    if (valor === "hoy") {
      setDesde(hoy);
      setHasta(hoy);
    } else if (valor === "ayer") {
      setDesde(ayer);
      setHasta(ayer);
    } else if (valor === "7d") {
      setDesde(addDaysKey(hoy, -6));
      setHasta(hoy);
    } else if (valor === "mes") {
      setDesde(`${hoy.slice(0, 7)}-01`);
      setHasta(hoy);
    }
    setPreset(valor);
  };

  const alternarDia = (fecha: string) => {
    setDiasColapsados((items) => items.includes(fecha) ? items.filter((item) => item !== fecha) : [...items, fecha]);
  };

  const volverAHoy = async () => {
    if (desde === hoy && hasta === hoy) {
      await loadCaja();
    } else {
      setDesde(hoy);
      setHasta(hoy);
      setPreset("hoy");
    }
  };

  const cobrar = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCita) return setMessage("Selecciona una cita pendiente de pago");
    if (adicionales.some((item) => !item.concepto.trim() || !Number.isFinite(Number(item.monto)) || Number(item.monto) <= 0)) return setMessage("Completa el concepto y un monto mayor a cero para cada adicional");
    if (totalDescuentos > Number(cita?.total || 0)) return setMessage("El descuento no puede superar el precio de la cita");
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) }, body: JSON.stringify({ id_cita: selectedCita, metodo_pago: metodo, descuento_manual: Number(descuento), tipo_descuento: tipoDescuento, id_promocion: promocion || null, adicionales: adicionales.map(({ concepto, monto }) => ({ concepto: concepto.trim(), monto: Number(monto) })) }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el cobro");
    setMessage(`Cobro registrado: ${formatoMoneda(result.data.total)}`);
    setSelectedCita(""); setDescuento("0"); setPromocion(""); setAdicionales([]);
    await volverAHoy();
  };

  const registrarEgreso = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/caja", { method: "POST", headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) }, body: JSON.stringify({ tipo: "egreso", ...egreso }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "No se pudo registrar el egreso");
    setMessage("Egreso registrado"); setEgreso({ concepto: "", monto: "", metodo_pago: "efectivo" });
    await volverAHoy();
  };

  if (sessionLoading || roleLoading) return <div className="bento-card text-sm text-brand-text-light">Verificando permisos…</div>;
  if (!canManage) return <div className="bento-card"><h1 className="font-display text-3xl font-bold text-brand-green">Caja</h1><p className="mt-2 text-sm leading-6 text-brand-text-light">Tu rol no tiene permiso para cobrar ni registrar movimientos. Pide a un administrador que te asigne el rol de recepción.</p></div>;

  const presets: { value: Preset; label: string }[] = [
    { value: "hoy", label: "Hoy" },
    { value: "ayer", label: "Ayer" },
    { value: "7d", label: "7 días" },
    { value: "mes", label: "Este mes" },
  ];

  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-bold text-brand-green">Caja</h1><p className="text-brand-text-light mt-1">Cobra citas y controla ingresos y egresos</p></div>
    {message && <div className="bento-card text-sm text-brand-green">{message}</div>}

    <div className="bento-card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays size={18} className="text-brand-green" aria-hidden="true" />
        <span className="mr-1 text-sm font-semibold">Período</span>
        {presets.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => aplicarPreset(item.value)}
            aria-pressed={preset === item.value}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${preset === item.value ? "border-brand-green bg-brand-green text-white" : "border-brand-cream-dark bg-white text-brand-text-light hover:border-brand-green hover:text-brand-green"}`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset("rango")}
          aria-pressed={preset === "rango"}
          className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${preset === "rango" ? "border-brand-green bg-brand-green text-white" : "border-brand-cream-dark bg-white text-brand-text-light hover:border-brand-green hover:text-brand-green"}`}
        >
          Otra fecha
        </button>
        <span className="ml-auto text-xs text-brand-text-light">{etiquetaPeriodo}</span>
      </div>
      {preset === "rango" && (
        <div className="flex flex-wrap items-end gap-3 border-t border-brand-cream-dark pt-3">
          <label className="text-xs font-medium">
            <span className="mb-1 block text-brand-text-light">Desde</span>
            <input
              type="date"
              className="input-field py-2"
              value={desde}
              max={hoy}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                setDesde(value);
                if (value > hasta) setHasta(value);
              }}
            />
          </label>
          <label className="text-xs font-medium">
            <span className="mb-1 block text-brand-text-light">Hasta</span>
            <input
              type="date"
              className="input-field py-2"
              value={hasta}
              min={desde}
              max={hoy}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                setHasta(value);
                if (value < desde) setDesde(value);
              }}
            />
          </label>
          <p className="pb-2 text-xs text-brand-text-light">Puedes ver un solo día o un rango completo.</p>
        </div>
      )}
    </div>

    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Resumen · {etiquetaPeriodo}</h2>
        <span className="text-xs text-brand-text-light">Comparado con {etiquetaAnterior}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={ArrowUpCircle} label="Ingresos" value={formatoMoneda(ingresos)} color="text-green-600" />
        <StatsCard icon={ArrowDownCircle} label="Egresos" value={formatoMoneda(egresos)} color="text-red-600" />
        <StatsCard icon={Calculator} label="Balance" value={formatoMoneda(ingresos - egresos)} />
        <StatsCard icon={Wallet} label="Movimientos" value={movimientos.length} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-brand-text-light">
        <span>Ingresos del período anterior: <strong className="text-brand-text">{formatoMoneda(resumenAnterior.ingresos)}</strong></span>
        {variacion === null ? (
          <span>· sin ingresos previos para comparar</span>
        ) : (
          <span className={`inline-flex items-center gap-1 font-semibold ${variacion >= 0 ? "text-green-600" : "text-red-600"}`}>
            {variacion >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
            {variacion >= 0 ? "+" : ""}{variacion.toFixed(0)}%
          </span>
        )}
      </div>
    </div>

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

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Movimientos por día</h2>
          <p className="text-xs text-brand-text-light">Cada día tiene su propio subtotal. Toca la cabecera para plegarlo.</p>
        </div>
        {!cierresDisponibles && (
          <p className="max-w-md rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            El cierre de caja se activa al aplicar <code className="font-mono">config/migration-cierre-caja.sql</code> en Supabase.
          </p>
        )}
      </div>

      {cargando && movimientos.length === 0 ? (
        <div className="bento-card text-sm text-brand-text-light">Cargando movimientos…</div>
      ) : dias.length === 0 ? (
        <div className="bento-card text-sm text-brand-text-light">No hay movimientos en este período.</div>
      ) : (
        dias.map((dia) => {
          const colapsado = diasColapsados.includes(dia.fecha);
          const cierre = cierrePorFecha.get(dia.fecha) || null;
          return (
            <section key={dia.fecha} className="rounded-2xl border border-brand-cream-dark bg-white shadow-sm">
              <div className="sticky top-20 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-2xl border-b border-brand-cream-dark bg-white/95 px-4 py-3 backdrop-blur">
                <button type="button" onClick={() => alternarDia(dia.fecha)} aria-expanded={!colapsado} aria-controls={`dia-${dia.fecha}`} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-brand-text-light transition-transform ${colapsado ? "-rotate-90" : ""}`} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{formatDayLabel(dia.fecha)}</span>
                      {etiquetaDia(dia.fecha) && <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">{etiquetaDia(dia.fecha)}</span>}
                    </span>
                    <span className="block text-xs text-brand-text-light">{dia.items.length} {dia.items.length === 1 ? "movimiento" : "movimientos"}</span>
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                  <span className="text-green-600">+{formatoMoneda(dia.ingresos)}</span>
                  <span className="text-red-600">−{formatoMoneda(dia.egresos)}</span>
                  <span className="rounded-lg bg-brand-cream px-2 py-1 font-semibold">Balance {formatoMoneda(dia.balance)}</span>
                </div>
                {cierresDisponibles && dia.fecha <= hoy && (
                  cierre ? (
                    <button type="button" onClick={() => setCierreDia(dia)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-green/10 px-3 text-xs font-semibold text-brand-green"><Lock size={14} aria-hidden="true" /> Cerrada</button>
                  ) : (
                    <button type="button" onClick={() => setCierreDia(dia)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-cream-dark px-3 text-xs font-semibold text-brand-text-light hover:border-brand-green hover:text-brand-green"><LockOpen size={14} aria-hidden="true" /> Cerrar caja</button>
                  )
                )}
              </div>

              <div id={`dia-${dia.fecha}`} hidden={colapsado}>
                {dia.metodos.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-b border-brand-cream-dark bg-brand-cream/40 px-4 py-2">
                    {dia.metodos.map(([metodo, totales]) => (
                      <span key={metodo} className="rounded-full bg-white px-2.5 py-1 text-xs">
                        {ETIQUETAS_METODO[metodo] || metodo}: <strong className="text-green-600">+{formatoMoneda(totales.ingresos)}</strong>
                        {totales.egresos > 0 && <span className="text-red-600"> · −{formatoMoneda(totales.egresos)}</span>}
                      </span>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-brand-cream">
                  {dia.items.map((mov) => <button key={mov.id} type="button" onClick={() => setMovimientoDetalle(mov)} aria-label={`Ver detalle: ${mov.concepto}, ${formatoMoneda(mov.monto)}`} className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-brand-cream/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mov.tipo === "ingreso" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{mov.tipo === "ingreso" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}</span><span className="flex-1"><span className="block font-medium">{mov.concepto}</span><span className="block text-xs text-brand-text-light">{new Date(mov.created_at).toLocaleString("es-PE", { timeStyle: "short", dateStyle: "short" })} · {ETIQUETAS_METODO[mov.metodo_pago] || mov.metodo_pago}</span></span><span className={`shrink-0 font-bold ${mov.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>{mov.tipo === "ingreso" ? "+" : "-"}{formatoMoneda(mov.monto)}</span><ChevronRight size={18} className="shrink-0 text-brand-text-light" /></button>)}
                </div>
              </div>
            </section>
          );
        })
      )}
    </section>

    {movimientoDetalle && <DetalleMovimientoModal movimiento={movimientoDetalle} onClose={() => setMovimientoDetalle(null)} />}
    {cierreDia && (
      <CierreCajaModal
        dia={cierreDia}
        cierre={cierrePorFecha.get(cierreDia.fecha) || null}
        onClose={() => setCierreDia(null)}
        onSaved={() => { setCierreDia(null); void loadCaja(); }}
        getAuthHeaders={getAuthHeaders}
      />
    )}
  </div>;
}
