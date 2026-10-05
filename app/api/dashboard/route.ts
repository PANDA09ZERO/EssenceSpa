import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [{ count: clientes }, { count: servicios }, { count: citasHoy }, { data: citas }, { data: serviciosLista }, { data: movimientos },] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("servicios").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("citas").select("id", { count: "exact", head: true }).eq("fecha", today),
    supabase.from("citas").select("id, fecha, hora_inicio, total, estado, clientes(nombre, apellido), servicios(nombre)").gte("fecha", today).order("fecha", { ascending: true }).order("hora_inicio", { ascending: true }).limit(5),
    supabase.from("servicios").select("id, nombre, categoria, precio").eq("estado", "activo").order("nombre").limit(3),
    supabase.from("movimientos_caja").select("tipo, monto").eq("tipo", "ingreso").gte("created_at", `${monthStart}T00:00:00.000Z`),
  ]);

  const errors = [clientes, servicios, citasHoy, citas, serviciosLista, movimientos].some((value) => value === undefined);
  if (errors) return NextResponse.json({ error: "No se pudo cargar el resumen del dashboard" }, { status: 400 });

  const ingresosMes = (movimientos || []).reduce((total, movimiento) => total + Number(movimiento.monto || 0), 0);
  return NextResponse.json({
    stats: { clientes: clientes || 0, servicios: servicios || 0, citasHoy: citasHoy || 0, ingresosMes },
    citas: citas || [],
    servicios: serviciosLista || [],
  });
}
