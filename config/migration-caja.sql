-- Ejecutar después del esquema base en Supabase.
ALTER TABLE citas ADD COLUMN IF NOT EXISTS id_servicio UUID REFERENCES servicios(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS cita_detalles (
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
DROP POLICY IF EXISTS "Todos pueden ver detalles de citas" ON cita_detalles;
DROP POLICY IF EXISTS "Todos pueden insertar detalles de citas" ON cita_detalles;
CREATE POLICY "Todos pueden ver detalles de citas" ON cita_detalles FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar detalles de citas" ON cita_detalles FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_cita_detalles_cita ON cita_detalles(id_cita);
NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS pagos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_cita UUID UNIQUE REFERENCES citas(id) ON DELETE SET NULL,
  id_cliente UUID REFERENCES clientes(id) ON DELETE SET NULL,
  id_promocion UUID REFERENCES promociones(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS pago_adicionales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  id_pago UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL CHECK (char_length(btrim(concepto)) BETWEEN 1 AND 120),
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pago_adicionales_pago ON pago_adicionales(id_pago);

CREATE TABLE IF NOT EXISTS movimientos_caja (
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
ALTER TABLE movimientos_caja ADD COLUMN IF NOT EXISTS id_pago UUID REFERENCES pagos(id) ON DELETE SET NULL;

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver pagos" ON pagos;
DROP POLICY IF EXISTS "Todos pueden insertar pagos" ON pagos;
DROP POLICY IF EXISTS "Todos pueden ver adicionales de pagos" ON pago_adicionales;
DROP POLICY IF EXISTS "Todos pueden insertar adicionales de pagos" ON pago_adicionales;
DROP POLICY IF EXISTS "Todos pueden ver movimientos" ON movimientos_caja;
DROP POLICY IF EXISTS "Todos pueden insertar movimientos" ON movimientos_caja;
CREATE POLICY "Todos pueden ver pagos" ON pagos FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar pagos" ON pagos FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden ver adicionales de pagos" ON pago_adicionales FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar adicionales de pagos" ON pago_adicionales FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT ON pago_adicionales TO anon, authenticated;
CREATE POLICY "Todos pueden ver movimientos" ON movimientos_caja FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar movimientos" ON movimientos_caja FOR INSERT WITH CHECK (true);

DROP FUNCTION IF EXISTS cobrar_cita(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION cobrar_cita(
  p_id_cita UUID, p_metodo_pago TEXT, p_descuento_manual DECIMAL DEFAULT 0,
  p_tipo_descuento TEXT DEFAULT 'monto_fijo', p_id_promocion UUID DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL, p_adicionales JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_cita citas%ROWTYPE; v_adicional JSONB; v_adicional_monto DECIMAL(10,2);
  v_subtotal_cita DECIMAL(10,2); v_subtotal_adicionales DECIMAL(10,2) := 0;
  v_subtotal DECIMAL(10,2); v_descuento DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2); v_pago pagos%ROWTYPE; v_promocion promociones%ROWTYPE;
BEGIN
  SELECT * INTO v_cita FROM citas WHERE id = p_id_cita FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cita no existe'; END IF;
  IF EXISTS (SELECT 1 FROM pagos WHERE id_cita = p_id_cita AND estado = 'pagado') THEN RAISE EXCEPTION 'La cita ya tiene un pago registrado'; END IF;
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
    SELECT * INTO v_promocion FROM promociones WHERE id = p_id_promocion AND activa = true
      AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE) AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE);
    IF NOT FOUND THEN RAISE EXCEPTION 'La promoción no está vigente'; END IF;
    v_descuento := v_subtotal_cita * (v_promocion.descuento / 100);
  END IF;
  IF p_descuento_manual > 0 THEN
    IF p_tipo_descuento = 'porcentaje' THEN v_descuento := v_descuento + (v_subtotal_cita * p_descuento_manual / 100);
    ELSE v_descuento := v_descuento + p_descuento_manual; END IF;
  END IF;
  IF v_descuento > v_subtotal_cita THEN RAISE EXCEPTION 'El descuento no puede superar el precio de la cita'; END IF;
  v_total := ROUND(v_subtotal - v_descuento, 2);
  INSERT INTO pagos (id_cita, id_cliente, id_promocion, subtotal, descuento, tipo_descuento, total, metodo_pago, observaciones)
    VALUES (p_id_cita, v_cita.id_cliente, p_id_promocion, v_subtotal, v_descuento, p_tipo_descuento, v_total, p_metodo_pago, p_observaciones) RETURNING * INTO v_pago;
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
NOTIFY pgrst, 'reload schema';
