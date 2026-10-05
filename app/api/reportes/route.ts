import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const pageSize = 1000;

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

async function getIncomeMovements(start: string, end: string) {
  const movements: { monto: number; created_at: string }[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("movimientos_caja")
      .select("monto, created_at")
      .eq("tipo", "ingreso")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    movements.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return movements;
}

async function getPaidAppointments(start: string, end: string) {
  const appointmentIds: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("pagos")
      .select("id_cita")
      .eq("estado", "pagado")
      .not("id_cita", "is", null)
      .gte("created_at", start)
      .lt("created_at", end)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    appointmentIds.push(...(data || []).map((payment) => payment.id_cita).filter((id): id is string => Boolean(id)));
    if (!data || data.length < pageSize) break;
  }
  return [...new Set(appointmentIds)];
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return NextResponse.json({ error: "Debes iniciar sesión para ver los reportes" }, { status: 401 });
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user?.email) return NextResponse.json({ error: "La sesión no es válida" }, { status: 401 });
    const { data: employee, error: employeeError } = await supabase
      .from("empleados")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) return NextResponse.json({ error: "Solo el equipo puede consultar los reportes" }, { status: 403 });

    const now = new Date();
    const currentMonthStart = getMonthStart(now);
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const start = firstMonth.toISOString();
    const end = nextMonthStart.toISOString();

    const [movements, appointmentsResult, appointmentIds] = await Promise.all([
      getIncomeMovements(start, end),
      supabase
        .from("citas")
        .select("id", { count: "exact", head: true })
        .gte("fecha", currentMonthStart.toISOString().slice(0, 10))
        .lt("fecha", nextMonthStart.toISOString().slice(0, 10)),
      getPaidAppointments(start, end),
    ]);

    if (appointmentsResult.error) throw appointmentsResult.error;

    const monthlyTotals = new Map<string, number>();
    for (let offset = 0; offset < 6; offset += 1) {
      const month = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + offset, 1));
      monthlyTotals.set(monthKey(month), 0);
    }
    for (const movement of movements) {
      const key = movement.created_at.slice(0, 7);
      if (monthlyTotals.has(key)) monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + Number(movement.monto || 0));
    }

    const serviceTotals = new Map<string, number>();
    for (let offset = 0; offset < appointmentIds.length; offset += 200) {
      const { data, error } = await supabase
        .from("cita_detalles")
        .select("cantidad, servicios(nombre)")
        .in("id_cita", appointmentIds.slice(offset, offset + 200));
      if (error) throw error;
      for (const detail of data || []) {
        const service = Array.isArray(detail.servicios) ? detail.servicios[0] : detail.servicios;
        const serviceName = service?.nombre;
        if (serviceName) serviceTotals.set(serviceName, (serviceTotals.get(serviceName) || 0) + Number(detail.cantidad || 1));
      }
    }

    const totalServices = [...serviceTotals.values()].reduce((sum, count) => sum + count, 0);
    const serviciosPopulares = [...serviceTotals.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad, porcentaje: totalServices ? Math.round((cantidad / totalServices) * 100) : 0 }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const ingresosMensuales = [...monthlyTotals.entries()].map(([mes, total]) => {
      const [year, month] = mes.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, 1));
      const etiqueta = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(date).replace(".", "");
      return { mes, etiqueta, total };
    });
    const ingresosMes = monthlyTotals.get(monthKey(currentMonthStart)) || 0;

    return NextResponse.json({
      stats: {
        ingresosMes,
        citasMes: appointmentsResult.count || 0,
        promedioDiario: ingresosMes / now.getUTCDate(),
        servicioTop: serviciosPopulares[0]?.nombre || "Sin datos",
      },
      ingresosMensuales,
      serviciosPopulares,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los reportes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}