import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

interface EmployeeRoleOptions {
  roles?: string[];
  message?: string;
}

export interface EmployeeSession {
  id: string;
  email: string;
  rol: string;
  nombre: string | null;
  apellido: string | null;
}

type EmployeeResult = { employee: EmployeeSession } | { error: NextResponse };

const EMPLOYEE_COLUMNS = "id, email, rol, nombre, apellido, auth_user_id";

/** Escapa los comodines de LIKE/ILIKE (%, _ y \) para comparar texto literal. */
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function resolveEmployee(request: NextRequest): Promise<EmployeeResult> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return { error: NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 }) };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: NextResponse.json({ error: "El servidor no está configurado" }, { status: 500 }) };
  }

  const { data: { user }, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !user?.email) {
    return { error: NextResponse.json({ error: "La sesión no es válida" }, { status: 401 }) };
  }

  // 1) Vínculo fuerte: la fila de empleados apunta al id de Supabase Auth.
  const byAuthId = await admin.from("empleados")
    .select(EMPLOYEE_COLUMNS)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (byAuthId.error) {
    return { error: NextResponse.json({ error: "No se pudo validar el permiso" }, { status: 500 }) };
  }
  let employee = byAuthId.data;

  // 2) Cuentas antiguas sin auth_user_id: se acepta el email solo si está
  //    confirmado, se compara literal (sin comodines) y se vincula la cuenta
  //    para que los próximos accesos usen el id.
  if (!employee) {
    if (!user.email_confirmed_at) {
      return { error: NextResponse.json({ error: "Solo el equipo puede acceder" }, { status: 403 }) };
    }
    const byEmail = await admin.from("empleados")
      .select(EMPLOYEE_COLUMNS)
      .is("auth_user_id", null)
      .ilike("email", escapeLikePattern(user.email))
      .limit(2);
    if (byEmail.error) {
      return { error: NextResponse.json({ error: "No se pudo validar el permiso" }, { status: 500 }) };
    }
    if ((byEmail.data || []).length !== 1) {
      return { error: NextResponse.json({ error: "Solo el equipo puede acceder" }, { status: 403 }) };
    }
    employee = byEmail.data![0];
    await admin.from("empleados").update({ auth_user_id: user.id }).eq("id", employee.id).is("auth_user_id", null);
  }

  if (!employee) {
    return { error: NextResponse.json({ error: "Solo el equipo puede acceder" }, { status: 403 }) };
  }

  const { auth_user_id: _authUserId, ...session } = employee;
  return { employee: session as EmployeeSession };
}

/**
 * Valida el token de la sesión y comprueba que pertenezca a un empleado.
 * Si se indican roles, también exige que el empleado tenga uno de ellos.
 * Devuelve null cuando el acceso está permitido.
 */
export async function authorizeEmployeeRequest(
  request: NextRequest,
  options: EmployeeRoleOptions = {},
) {
  const result = await requireEmployeeRequest(request, options);
  return "error" in result ? result.error : null;
}

/**
 * Igual que authorizeEmployeeRequest, pero además devuelve los datos del
 * empleado autenticado (útil para registrar quién hizo la acción).
 */
export async function requireEmployeeRequest(
  request: NextRequest,
  options: EmployeeRoleOptions = {},
): Promise<EmployeeResult> {
  const result = await resolveEmployee(request);
  if ("error" in result) return result;
  if (options.roles && !options.roles.includes(result.employee.rol)) {
    return {
      error: NextResponse.json(
        { error: options.message || "No tienes permiso para esta acción" },
        { status: 403 },
      ),
    };
  }

  return result;
}

export async function authorizeAdminEmployeeRequest(request: NextRequest) {
  return authorizeEmployeeRequest(request, {
    roles: ["admin"],
    message: "Solo un administrador puede gestionar empleados",
  });
}

/** Solo administración puede modificar catálogo y promociones. */
export const CATALOG_ADMIN = { roles: ["admin"], message: "Solo un administrador puede modificar el catálogo" };
