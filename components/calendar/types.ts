// Tipos compartidos del módulo de citas / calendario.
export interface Appointment {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  estado: string;
  notas: string | null;
  id_cliente?: string | null;
  id_empleado?: string | null;
  id_servicio?: string | null;
  nombre_invitado?: string | null;
  telefono_invitado?: string | null;
  clientes: { nombre: string; apellido: string } | null;
  servicios: { nombre: string; precio?: number; duracion?: number } | null;
  empleados: { nombre: string; apellido: string } | null;
  cita_detalles?: { id_servicio: string; servicios: { nombre: string; duracion?: number } | null }[] | null;
}
