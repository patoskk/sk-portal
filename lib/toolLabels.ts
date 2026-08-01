// Etiquetas amigables para nombres crudos de tools de n8n (el público es un
// dueño de negocio, no técnico). Fallback: capitalizar y sacar guiones bajos.
const KNOWN: Record<string, string> = {
  stock: "Precios y stock",
  get_promos: "Promociones",
  imagenes: "Imágenes",
  pedidos: "Pedidos",
  calculator: "Cálculos",
  turnos: "Turnos",
  reservas: "Reservas",
  agendar_turno: "Turnos agendados",
  disponibilidad: "Horarios disponibles",
  registrar_pago: "Pagos registrados",
};

export function toolLabel(name: string): string {
  const key = name.trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  const plain = name.replace(/_/g, " ").trim().toLowerCase();
  return plain ? plain.charAt(0).toUpperCase() + plain.slice(1) : name;
}
