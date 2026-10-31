-- ============================================
-- Permisos de Caja y cobros
-- Ejecutar en Supabase SQL Editor.
--
-- Cierra el acceso directo con la clave pública (anon/authenticated) a las
-- tablas de dinero. Desde este cambio, solo el servidor (service_role) lee y
-- escribe pagos, adicionales y movimientos, después de validar en /api/caja
-- que la sesión pertenece a un administrador o a recepción.
-- ============================================

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver pagos" ON pagos;
DROP POLICY IF EXISTS "Todos pueden insertar pagos" ON pagos;
DROP POLICY IF EXISTS "Todos pueden ver adicionales de pagos" ON pago_adicionales;
DROP POLICY IF EXISTS "Todos pueden insertar adicionales de pagos" ON pago_adicionales;
DROP POLICY IF EXISTS "Todos pueden ver movimientos" ON movimientos_caja;
DROP POLICY IF EXISTS "Todos pueden insertar movimientos" ON movimientos_caja;

REVOKE ALL ON pagos FROM anon, authenticated;
REVOKE ALL ON pago_adicionales FROM anon, authenticated;
REVOKE ALL ON movimientos_caja FROM anon, authenticated;

GRANT ALL ON pagos TO service_role;
GRANT ALL ON pago_adicionales TO service_role;
GRANT ALL ON movimientos_caja TO service_role;

-- La función que registra el cobro tampoco puede llamarse desde el navegador.
REVOKE ALL ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
