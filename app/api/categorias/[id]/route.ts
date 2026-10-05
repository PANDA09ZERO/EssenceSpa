import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "El nombre de la categoría es obligatorio." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: categoriaActual, error: lookupError } = await supabase
    .from("categorias")
    .select("id, nombre, descripcion, icono")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
  if (!categoriaActual) return NextResponse.json({ error: "No se encontró la categoría." }, { status: 404 });

  const nombreAnterior = categoriaActual.nombre;
  const nombreCambio = nombre !== nombreAnterior;
  if (nombreCambio) {
    const { data: categoriaDuplicada, error: duplicateError } = await supabase
      .from("categorias")
      .select("id")
      .eq("nombre", nombre)
      .neq("id", id)
      .limit(1)
      .maybeSingle();
    if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 400 });
    if (categoriaDuplicada) return NextResponse.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 });

    const { data: categoriasConMismoNombre, error: ambiguityError } = await supabase
      .from("categorias")
      .select("id")
      .eq("nombre", nombreAnterior)
      .limit(2);
    if (ambiguityError) return NextResponse.json({ error: ambiguityError.message }, { status: 400 });
    if (categoriasConMismoNombre && categoriasConMismoNombre.length > 1) {
      return NextResponse.json({ error: "No se puede renombrar esta categoría porque hay varias categorías con el mismo nombre." }, { status: 409 });
    }

  }

  const { data, error } = await supabase
    .from("categorias")
    .update({
      nombre,
      descripcion: typeof body.descripcion === "string" && body.descripcion.trim() ? body.descripcion.trim() : null,
      icono: typeof body.icono === "string" && body.icono.trim() ? body.icono.trim() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (nombreCambio) {
    const { error: servicesError } = await supabase
      .from("servicios")
      .update({ categoria: nombre })
      .eq("categoria", nombreAnterior);
    if (servicesError) {
      const { error: rollbackError } = await supabase
        .from("categorias")
        .update({
          nombre: nombreAnterior,
          descripcion: categoriaActual.descripcion,
          icono: categoriaActual.icono,
        })
        .eq("id", id);
      if (rollbackError) {
        return NextResponse.json({ error: `No se pudieron actualizar los servicios y tampoco restaurar la categoría: ${servicesError.message}; ${rollbackError.message}` }, { status: 500 });
      }
      return NextResponse.json({ error: `No se pudieron actualizar los servicios de esta categoría: ${servicesError.message}` }, { status: 400 });
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: categoria, error: lookupError } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
  if (!categoria) return NextResponse.json({ error: "No se encontró la categoría." }, { status: 404 });

  const { count, error: servicesError } = await supabase
    .from("servicios")
    .select("id", { count: "exact", head: true })
    .eq("categoria", categoria.nombre);
  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 });
  if (count) {
    return NextResponse.json({
      error: `No se puede eliminar "${categoria.nombre}" porque tiene ${count} ${count === 1 ? "servicio asociado" : "servicios asociados"}. Cambia primero la categoría de esos servicios.`,
    }, { status: 409 });
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
