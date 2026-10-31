import { NextRequest, NextResponse } from "next/server";
import { authorizeEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const denied = await authorizeEmployeeRequest(request);
  if (denied) return denied;
  const supabase = createSupabaseAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;
  const results = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("servicios").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("citas").select("id", { count: "exact", head: true }).eq("fecha", today),
    supabase.from("citas").select("id, fecha, hora_inicio, total, estado, nombre_invitado, telefono_invitado, clientes(nombre, apellido), servicios(nombre)").gte("fecha", today).order("fecha", { ascending: true }).order("hora_inicio", { ascending: true }).limit(5),
    supabase.from("servicios").select("id, nombre, categoria, precio").eq("estado", "activo").order("nombre").limit(3),
    supabase.from("movimientos_caja").select("tipo, monto").eq("tipo", "ingreso").gte("created_at", `${monthStart}T00:00:00.000Z`),
  ]);

  if (results.some(result => result.error)) return NextResponse.json({ error: "No se pudo cargar el resumen. Inténtalo nuevamente." }, { status: 503 });
  const [{ count: clientes }, { count: servicios }, { count: citasHoy }, { data: citas }, { data: serviciosLista }, { data: movimientos }] = results;

  const ingresosMes = (movimientos || []).reduce((total, movimiento) => total + Number(movimiento.monto || 0), 0);
  return NextResponse.json({
    stats: { clientes: clientes || 0, servicios: servicios || 0, citasHoy: citasHoy || 0, ingresosMes },
    citas: citas || [],
    servicios: serviciosLista || [],
  });
}
