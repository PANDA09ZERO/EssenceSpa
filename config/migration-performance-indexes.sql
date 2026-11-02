-- Índices para mejorar el rendimiento de las consultas frecuentes.
-- Ejecutar en Supabase (SQL Editor).

-- Citas: filtrado por fecha y estado
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas (fecha);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas (estado);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_estado ON citas (fecha, estado);

-- Movimientos de caja: filtrado por fecha de creación
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_created_at ON movimientos_caja (created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja (tipo);

-- Pagos: búsqueda por cita
CREATE INDEX IF NOT EXISTS idx_pagos_id_cita ON pagos (id_cita);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos (estado);

-- Empleados: búsqueda por email (login/rol)
CREATE INDEX IF NOT EXISTS idx_empleados_email ON empleados (email);
CREATE INDEX IF NOT EXISTS idx_empleados_auth_user_id ON empleados (auth_user_id);

-- Clientes: ordenamiento por nombre
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (nombre, apellido);

-- Servicios: filtrado por estado
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios (estado);

-- Cierres de caja: filtrado por fecha
CREATE INDEX IF NOT EXISTS idx_cierres_caja_fecha ON cierres_caja (fecha);

-- Cita detalles: búsqueda por cita
CREATE INDEX IF NOT EXISTS idx_cita_detalles_id_cita ON cita_detalles (id_cita);