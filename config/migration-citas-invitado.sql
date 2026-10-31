-- ============================================
-- Citas con cliente invitado
-- Ejecutar en Supabase SQL Editor antes de desplegar el código.
--
-- Permite agendar una cita sin un cliente registrado. La cita guarda el
-- nombre (y opcionalmente el teléfono) del invitado. Si luego vuelve, se
-- puede convertir en cliente desde el detalle de la cita.
-- ============================================

ALTER TABLE citas ADD COLUMN IF NOT EXISTS nombre_invitado TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS telefono_invitado TEXT;

-- Toda cita debe tener un cliente registrado o, como mínimo, un nombre de
-- invitado. Se agrega como NOT VALID para no fallar con citas antiguas.
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_cliente_o_invitado;
ALTER TABLE citas ADD CONSTRAINT citas_cliente_o_invitado
  CHECK (id_cliente IS NOT NULL OR (nombre_invitado IS NOT NULL AND btrim(nombre_invitado) <> ''))
  NOT VALID;

NOTIFY pgrst, 'reload schema';
