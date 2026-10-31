-- Supabase migration for Essence Spa
-- Remove loyalty card features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: clientes
-- ============================================
CREATE TABLE clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  direccion TEXT,
  fecha_nacimiento DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: empleados
-- ============================================
CREATE TABLE empleados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  cargo TEXT,
  rol TEXT CHECK (rol IN ('admin', 'manicurista', 'recepcionista')) DEFAULT 'manicurista',
  password_hash TEXT,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  especialidad TEXT[],
  disponibilidad JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: servicios
-- ============================================
CREATE TABLE servicios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  imagen TEXT,
  precio DECIMAL(10,2) DEFAULT 0,
  duracion INTEGER DEFAULT 60,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: categorias
-- ============================================
CREATE TABLE categorias (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: citas
-- ============================================
CREATE TABLE citas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_cliente UUID REFERENCES clientes(id) ON DELETE CASCADE,
  id_empleado UUID REFERENCES empleados(id) ON DELETE SET NULL,
  id_servicio UUID REFERENCES servicios(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT,
  estado TEXT DEFAULT 'pendiente',
  notas TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  -- Cita de un invitado sin cliente registrado.
  nombre_invitado TEXT,
  telefono_invitado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT citas_cliente_o_invitado CHECK (
    id_cliente IS NOT NULL OR (nombre_invitado IS NOT NULL AND btrim(nombre_invitado) <> '')
  )
);

-- ============================================
-- TABLE: cita_detalles
-- ============================================
CREATE TABLE cita_detalles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_cita UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_cita, id_servicio)
);

ALTER TABLE cita_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver detalles de citas" ON cita_detalles FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar detalles de citas" ON cita_detalles FOR INSERT WITH CHECK (true);
CREATE INDEX idx_cita_detalles_cita ON cita_detalles(id_cita);

-- ============================================
-- TABLE: pagos
-- ============================================
CREATE TABLE pagos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_cita UUID UNIQUE REFERENCES citas(id) ON DELETE SET NULL,
  id_cliente UUID REFERENCES clientes(id) ON DELETE SET NULL,
  id_promocion UUID,
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  descuento DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  tipo_descuento TEXT NOT NULL DEFAULT 'ninguno' CHECK (tipo_descuento IN ('ninguno', 'porcentaje', 'monto_fijo')),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  referencia TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'anulado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pago_adicionales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_pago UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL CHECK (char_length(btrim(concepto)) BETWEEN 1 AND 120),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: movimientos_caja
-- ============================================
CREATE TABLE movimientos_caja (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  concepto TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  referencia TEXT,
  id_pago UUID REFERENCES pagos(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: promociones
-- ============================================
CREATE TABLE promociones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  descuento DECIMAL(5,2) DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: configuracion
-- ============================================
CREATE TABLE configuracion (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pagos ADD CONSTRAINT pagos_promocion_fk
  FOREIGN KEY (id_promocion) REFERENCES promociones(id) ON DELETE SET NULL;

-- ============================================
-- POLICY: RLS para clientes
-- ============================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar clientes" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar clientes" ON clientes FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar clientes" ON clientes FOR DELETE USING (true);

-- Caja, pagos y adicionales: solo el servidor (service_role) accede a estas
-- tablas. Las rutas /api validan la sesión y el rol antes de consultar.
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pagos FROM anon, authenticated;
REVOKE ALL ON pago_adicionales FROM anon, authenticated;
REVOKE ALL ON movimientos_caja FROM anon, authenticated;

-- ============================================
-- POLICY: RLS para empleados
-- ============================================
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver empleados" ON empleados FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar empleados" ON empleados FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar empleados" ON empleados FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar empleados" ON empleados FOR DELETE USING (true);

-- ============================================
-- POLICY: RLS para servicios
-- ============================================
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver servicios" ON servicios FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar servicios" ON servicios FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar servicios" ON servicios FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar servicios" ON servicios FOR DELETE USING (true);

-- ============================================
-- POLICY: RLS para citas
-- ============================================
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver citas" ON citas FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar citas" ON citas FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar citas" ON citas FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar citas" ON citas FOR DELETE USING (true);

-- ============================================
-- POLICY: RLS para promociones
-- ============================================
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver promociones" ON promociones FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar promociones" ON promociones FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar promociones" ON promociones FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar promociones" ON promociones FOR DELETE USING (true);

-- ============================================
-- POLICY: RLS para configuracion
-- ============================================
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver configuracion" ON configuracion FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar configuracion" ON configuracion FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar configuracion" ON configuracion FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar configuracion" ON configuracion FOR DELETE USING (true);

-- ============================================
-- DATA INICIAL
-- ============================================
INSERT INTO servicios (nombre, descripcion, categoria, precio, duracion, estado) VALUES
('Manicura', 'Cuidado y decoración de uñas', 'Uñas', 35.00, 60, 'activo'),
('Pedicura', 'Cuidado de pies y uñas de pies', 'Uñas', 40.00, 60, 'activo'),
('Diseño de Uñas', 'Arte y diseño personalizado en uñas', 'Uñas', 120.00, 120, 'activo'),
('Masaje Relajante', 'Masaje terapéutico cuerpo completo', 'Spa', 80.00, 90, 'activo'),
('Tratamiento Facial', 'Limpieza profunda y hidratación', 'Spa', 65.00, 60, 'activo'),
('Peluado', 'Corte y peinado', 'Cabello', 25.00, 45, 'activo');

INSERT INTO categorias (nombre, descripcion, icono) VALUES
('Uñas', 'Tratamientos de manicura y pedicura', '💅'),
('Spa', 'Tratamientos relajantes y faciales', '🧖'),
('Cabello', 'Cortes y peinados', '💇');

INSERT INTO promociones (nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa) VALUES
('Bienvenida', '10% de descuento en tu primera visita', 10.00, '2026-01-01', '2026-12-31', true);

INSERT INTO configuracion (clave, valor) VALUES
('nombre_salon', 'Essence Spa'),
('direccion', 'Calle Principal 123'),
('telefono', '999888777'),
('email', 'info@essencespa.pe'),
('horario', 'Lunes-Sábado 9:00-19:00');

-- ============================================
-- ÍNDICES para rendimiento
-- ============================================
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_cliente ON citas(id_cliente);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_empleados_cargo ON empleados(cargo);
CREATE INDEX idx_servicios_categoria ON servicios(categoria);
CREATE INDEX idx_servicios_estado ON servicios(estado);
CREATE INDEX idx_pagos_fecha ON pagos(created_at);
CREATE INDEX idx_movimientos_caja_fecha ON movimientos_caja(created_at);

-- ============================================
-- Función para actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_empleados_updated BEFORE UPDATE ON empleados FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_servicios_updated BEFORE UPDATE ON servicios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_citas_updated BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_configuracion_updated BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: cobrar una cita con descuento
-- ============================================
DROP FUNCTION IF EXISTS cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION cobrar_cita(
  p_id_cita UUID,
  p_metodo_pago TEXT,
  p_descuento_manual DECIMAL DEFAULT 0,
  p_tipo_descuento TEXT DEFAULT 'monto_fijo',
  p_id_promocion UUID DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_adicionales JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_cita citas%ROWTYPE;
  v_adicional JSONB;
  v_adicional_monto DECIMAL(10,2);
  v_subtotal_cita DECIMAL(10,2);
  v_subtotal_adicionales DECIMAL(10,2) := 0;
  v_subtotal DECIMAL(10,2);
  v_descuento DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2);
  v_pago pagos%ROWTYPE;
  v_promocion promociones%ROWTYPE;
BEGIN
  SELECT * INTO v_cita FROM citas WHERE id = p_id_cita FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cita no existe'; END IF;
  IF EXISTS (SELECT 1 FROM pagos WHERE id_cita = p_id_cita AND estado = 'pagado') THEN
    RAISE EXCEPTION 'La cita ya tiene un pago registrado';
  END IF;

  v_subtotal_cita := COALESCE(v_cita.total, 0);
  IF v_subtotal_cita <= 0 THEN RAISE EXCEPTION 'La cita no tiene un importe válido'; END IF;
  IF jsonb_typeof(COALESCE(p_adicionales, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Los adicionales no son válidos'; END IF;
  IF jsonb_array_length(COALESCE(p_adicionales, '[]'::jsonb)) > 20 THEN RAISE EXCEPTION 'No se permiten más de 20 adicionales'; END IF;
  FOR v_adicional IN SELECT value FROM jsonb_array_elements(COALESCE(p_adicionales, '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_adicional) <> 'object'
      OR NULLIF(BTRIM(v_adicional->>'concepto'), '') IS NULL
      OR char_length(BTRIM(v_adicional->>'concepto')) > 120
      OR COALESCE(v_adicional->>'monto', '') !~ '^[0-9]+([.][0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Cada adicional debe tener un concepto y un monto válido';
    END IF;
    v_adicional_monto := (v_adicional->>'monto')::DECIMAL(10,2);
    IF v_adicional_monto <= 0 THEN RAISE EXCEPTION 'El monto de cada adicional debe ser mayor a cero'; END IF;
    v_subtotal_adicionales := v_subtotal_adicionales + v_adicional_monto;
  END LOOP;
  v_subtotal := v_subtotal_cita + v_subtotal_adicionales;

  IF p_id_promocion IS NOT NULL THEN
    SELECT * INTO v_promocion FROM promociones
    WHERE id = p_id_promocion AND activa = true
      AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE);
    IF NOT FOUND THEN RAISE EXCEPTION 'La promoción no está vigente'; END IF;
    v_descuento := v_subtotal_cita * (v_promocion.descuento / 100);
  END IF;

  IF p_descuento_manual > 0 THEN
    IF p_tipo_descuento = 'porcentaje' THEN v_descuento := v_descuento + (v_subtotal_cita * p_descuento_manual / 100);
    ELSE v_descuento := v_descuento + p_descuento_manual;
    END IF;
  END IF;
  IF v_descuento > v_subtotal_cita THEN RAISE EXCEPTION 'El descuento no puede superar el precio de la cita'; END IF;
  v_total := ROUND(v_subtotal - v_descuento, 2);

  INSERT INTO pagos (id_cita, id_cliente, id_promocion, subtotal, descuento, tipo_descuento, total, metodo_pago, observaciones)
  VALUES (p_id_cita, v_cita.id_cliente, p_id_promocion, v_subtotal, v_descuento, p_tipo_descuento, v_total, p_metodo_pago, p_observaciones)
  RETURNING * INTO v_pago;
  FOR v_adicional IN SELECT value FROM jsonb_array_elements(COALESCE(p_adicionales, '[]'::jsonb))
  LOOP
    INSERT INTO pago_adicionales (id_pago, concepto, monto)
    VALUES (v_pago.id, BTRIM(v_adicional->>'concepto'), (v_adicional->>'monto')::DECIMAL(10,2));
  END LOOP;
  INSERT INTO movimientos_caja (tipo, concepto, monto, metodo_pago, id_pago, observaciones)
  VALUES ('ingreso', 'Cobro de cita', v_total, p_metodo_pago, v_pago.id, p_observaciones);
  UPDATE citas SET estado = 'completada' WHERE id = p_id_cita;
  RETURN jsonb_build_object('pago', row_to_json(v_pago), 'total', v_total, 'descuento', v_descuento);
END;
$$;

-- La función solo se ejecuta desde el servidor, después de validar el rol.
REVOKE ALL ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, JSONB) TO service_role;

-- ============================================
-- EMPLEADO ADMIN POR DEFECTO
-- ============================================
-- Contraseña: admin123 (en producción usar bcrypt para hash)
INSERT INTO empleados (nombre, apellido, email, cargo, rol, password_hash, telefono)
VALUES ('Admin', 'System', 'admin@essencespa.pe', 'Gerente', 'admin', 'admin123', '999888777')
ON CONFLICT (email) DO NOTHING;
