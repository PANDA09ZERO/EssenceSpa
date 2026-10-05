export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  foto_perfil: string | null;
  rol: "admin" | "recepcionista" | "empleado" | "manicurista" | "cliente";
  estado: "activo" | "inactivo" | "suspendido";
  ultimo_acceso: string | null;
  fecha_registro: string;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  estado: "activo" | "inactivo";
  fecha_creacion: string;
}

export interface Servicio {
  id_servicio: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  duracion: number;
  costo: number | null;
  imagen: string | null;
  icono: string | null;
  comision_empleado: number;
  estado: "activo" | "inactivo";
  fecha_creacion: string;
}

export interface Empleado {
  id_empleado: number;
  id_usuario: number | null;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  foto: string | null;
  horario_trabajo: string | null;
  comision_porcentaje: number;
  salario_base: number | null;
  fecha_contratacion: string | null;
  estado: "activo" | "inactivo" | "vacaciones";
}

export interface Cliente {
  id_cliente: number;
  id_usuario: number | null;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string;
  direccion: string | null;
  fecha_nacimiento: string | null;
  genero: "femenino" | "masculino" | "otro" | null;
  preferencias: string | null;
  notas: string | null;
  estado: "activo" | "inactivo";
  fecha_registro: string;
  ultima_visita: string | null;
  total_gastado: number;
}

export interface Cita {
  id_cita: number;
  id_cliente: number | null;
  id_empleado: number | null;
  asunto: string | null;
  detalle_cita: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_total: number | null;
  estado: "pendiente" | "confirmada" | "en_progreso" | "completada" | "cancelada" | "no_asistio";
  notas: string | null;
  recordatorio_enviado: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  empleado_nombre?: string;
  servicio_nombre?: string;
  total?: number;
}

export interface DetalleCita {
  id_detalle: number;
  id_cita: number;
  id_servicio: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pago {
  id_pago: number;
  id_cita: number | null;
  id_cliente: number;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  comprobante: string | null;
  numero_comprobante: string | null;
  estado: "pagado" | "pendiente" | "cancelado" | "reembolsado";
  fecha_pago: string;
  observaciones: string | null;
}

export interface MovimientoCaja {
  id_movimiento: number;
  id_caja: number;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  fecha_movimiento: string;
  id_usuario: number | null;
}

export interface Promocion {
  id_promocion: number;
  titulo: string;
  descripcion: string | null;
  tipo: "descuento" | "paquete" | "2x1" | "regalo" | "especial";
  valor_descuento: number | null;
  tipo_descuento: "porcentaje" | "monto_fijo";
  id_servicio: number | null;
  condiciones: string | null;
  codigo_promocional: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  limite_uso: number;
  usos_actuales: number;
  imagen: string | null;
  estado: "activa" | "inactiva" | "expirada";
  fecha_creacion: string;
  creada_por: number | null;
}

export interface Configuracion {
  id_config: number;
  clave: string;
  valor: string | null;
  descripcion: string | null;
  fecha_actualizacion: string;
}
