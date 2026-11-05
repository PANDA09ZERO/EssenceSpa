-- ============================================
-- MIGRACIÓN: Endurecimiento de RLS (auditoría C-01 / C-02 / A-03)
-- Ejecutar en Supabase SQL Editor JUNTO con el despliegue del código que
-- autentica las rutas /api (todas pasan a usar el service role después de
-- validar la sesión). Si se ejecuta antes del despliegue, el dashboard
-- antiguo dejará de leer clientes y citas hasta que se publique el código nuevo.
--
-- Resultado:
--   * anon / authenticated ya no pueden escribir en ninguna tabla de negocio.
--   * El catálogo público solo lee servicios no inactivos y promociones activas.
--   * Cada empleado solo puede leer SU fila de empleados (para conocer su rol).
--   * password_hash deja de existir como dato legible.
-- Es idempotente: se puede volver a ejecutar.
-- ============================================

BEGIN;

-- --------------------------------------------
-- 1. Eliminar todas las políticas permisivas antiguas
-- --------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('empleados', 'clientes', 'citas', 'cita_detalles', 'servicios',
                        'categorias', 'promociones', 'configuracion')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- --------------------------------------------
-- 2. RLS activo y sin privilegios de escritura para anon / authenticated
-- --------------------------------------------
ALTER TABLE empleados     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cita_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promociones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON empleados, clientes, citas, cita_detalles, servicios, categorias, promociones, configuracion
  FROM anon, authenticated;

GRANT ALL ON empleados, clientes, citas, cita_detalles, servicios, categorias, promociones, configuracion
  TO service_role;

-- cierres_caja ya no tenía políticas, pero conservaba privilegios de tabla.
REVOKE ALL ON cierres_caja FROM anon, authenticated;
GRANT ALL ON cierres_caja TO service_role;

-- --------------------------------------------
-- 3. Catálogo público (página principal): solo lectura filtrada
-- --------------------------------------------
GRANT SELECT ON servicios, promociones TO anon, authenticated;

CREATE POLICY "Catalogo publico de servicios" ON servicios
  FOR SELECT TO anon, authenticated
  USING (estado IS DISTINCT FROM 'inactivo');

CREATE POLICY "Catalogo publico de promociones" ON promociones
  FOR SELECT TO anon, authenticated
  USING (activa = true);

-- --------------------------------------------
-- 4. Empleados: cada usuario autenticado solo ve su propia fila
--    (el panel la usa para mostrar el menú según el rol). Sin escritura.
--    El fallback por email cubre cuentas antiguas aún sin auth_user_id;
--    el servidor las vincula automáticamente en su primer acceso.
-- --------------------------------------------
UPDATE empleados SET password_hash = NULL WHERE password_hash IS NOT NULL;

GRANT SELECT (id, nombre, apellido, email, rol, cargo, auth_user_id) ON empleados TO authenticated;

CREATE POLICY "Empleado ve su propia fila" ON empleados
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
  );

-- --------------------------------------------
-- 5. Funciones: get_user_role() (SECURITY DEFINER) no debe ser invocable sin
--    sesión, y las funciones deben fijar su search_path (linter de Supabase).
-- --------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.get_user_role()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon';
  END IF;
END $$;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, JSONB) SET search_path = public;

-- --------------------------------------------
-- 6. Storage: el bucket público de servicios solo acepta imágenes.
-- --------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'servicios';

-- clientes, citas, cita_detalles, categorias y configuracion quedan sin
-- políticas: solo el servidor (service_role) accede, después de validar
-- la sesión y el rol en las rutas /api.

COMMIT;

NOTIFY pgrst, 'reload schema';

-- --------------------------------------------
-- Verificación (debe listar solo las 3 políticas nuevas en estas tablas):
-- SELECT tablename, policyname, cmd, roles, qual FROM pg_policies
-- WHERE schemaname = 'public' ORDER BY tablename;
--
-- Revisa también que no existan empleados inesperados con rol admin:
-- SELECT id, email, rol, auth_user_id, created_at FROM empleados ORDER BY created_at DESC;
-- --------------------------------------------
