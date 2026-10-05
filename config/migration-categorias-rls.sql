-- ============================================
-- MIGRATION: Políticas RLS para categorias
--
-- Contexto: la tabla categorias tenia RLS habilitado pero sin
-- políticas, por lo que el cliente anon devolvía siempre un array
-- vacío (las categorías creadas no se veían en /dashboard/categorias).
--
-- Ya se solucionó en código usando el cliente admin (service role)
-- en app/api/categorias/route.ts. Esta migración deja la tabla
-- consistente con el resto (servicios, citas, clientes, ...) para
-- que el cliente anon también pueda leerlas si se necesita.
--
-- Nota: si las políticas ya existen, no ejecutar (dará error de duplicado).
-- Para re-ejecutar, borrar primero con:
--   DROP POLICY IF EXISTS "Todos pueden ver categorias" ON categorias;
--   (repetir para cada política)
-- ============================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar categorias" ON categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar categorias" ON categorias FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar categorias" ON categorias FOR DELETE USING (true);
