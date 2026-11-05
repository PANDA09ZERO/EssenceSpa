import { boundedNumber, optionalText, requiredText } from "@/lib/api-input";

const ESTADOS = new Set(["activo", "inactivo"]);

export interface ServicioInput {
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  imagen: string | null;
  precio: number;
  duracion: number;
  estado?: string;
}

/** Whitelist de campos editables de un servicio (evita asignación masiva). */
export function servicioFromBody(body: Record<string, unknown>): { value: ServicioInput } | { error: string } {
  const nombre = requiredText(body.nombre, 120);
  if (!nombre) return { error: "El nombre del servicio es obligatorio" };
  const precio = boundedNumber(body.precio, 0, 99999);
  if (precio === null) return { error: "El precio no es válido" };
  const duracion = boundedNumber(body.duracion ?? 60, 1, 1440);
  if (duracion === null || !Number.isInteger(duracion)) return { error: "La duración no es válida" };

  const imagen = optionalText(body.imagen, 500);
  if (imagen && !/^(https:\/\/|\/(?!\/))/i.test(imagen)) return { error: "La imagen debe ser una URL https" };

  const value: ServicioInput = {
    nombre,
    descripcion: optionalText(body.descripcion, 1000),
    categoria: optionalText(body.categoria, 120),
    imagen,
    precio,
    duracion,
  };
  if (body.estado !== undefined) {
    if (typeof body.estado !== "string" || !ESTADOS.has(body.estado)) return { error: "El estado no es válido" };
    value.estado = body.estado;
  }
  return { value };
}
