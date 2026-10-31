-- ============================================
-- MIGRACIÓN: CIERRE DE CAJA POR DÍA
-- Ejecutar en Supabase (SQL Editor) una sola vez.
-- ============================================

CREATE TABLE IF NOT EXISTS cierres_caja (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Día cerrado en hora de Lima (America/Lima). Un cierre por día.
  fecha DATE NOT NULL UNIQUE,
  total_ingresos DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_egresos DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Efectivo esperado = ingresos en efectivo - egresos en efectivo del día.
  efectivo_esperado DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Lo que la persona contó físicamente (opcional).
  efectivo_contado DECIMAL(10,2),
  -- contado - esperado
  diferencia DECIMAL(10,2),
  -- Foto de los totales por método: { "efectivo": { "ingresos": 0, "egresos": 0 } }
  totales_metodo JSONB,
  observaciones TEXT,
  cerrado_por_email TEXT,
  cerrado_por_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cierres_caja_fecha ON cierres_caja(fecha DESC);

-- Solo el servidor (service role) accede a esta tabla.
-- Sin políticas, RLS bloquea la lectura/escritura desde el cliente público.
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- Verificación: debe devolver la tabla con 0 filas.
-- SELECT * FROM cierres_caja ORDER BY fecha DESC LIMIT 5;
