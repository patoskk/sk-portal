// Contrato de las tablas resumen del portal. Grano DIARIO para poder filtrar por
// cualquier rango sumando filas (WHERE date BETWEEN x AND y).
// Mantiene el mismo vocabulario que report_data.json de metrics-pdf-report.

export interface MetricsDailyRow {
  date: string; // YYYY-MM-DD (hora local del cliente)
  conversations: number; // sesiones distintas activas ese día
  order_sessions: number; // sesiones distintas con PEDIDOS
  stock_sessions: number; // sesiones distintas con STOCK (paso del embudo)
  messages_human: number;
  messages_total: number;
  stock_queries: number; // cantidad de llamadas STOCK
  orders: number; // cantidad de llamadas PEDIDOS
  errors: number;
  tool_results: number; // denominador de la tasa de error
  images_sent: number;
  response_sum_sec: number; // sumar y dividir por response_count para promediar sobre el rango
  response_count: number;
}

// found=true  -> búsqueda STOCK con resultado (top productos)
// found=false -> "No se encontraron productos" (quiebre = venta perdida)
export interface ProductQueryDailyRow {
  date: string;
  product: string;
  count: number;
  found: boolean;
}

export interface ToolUsageDailyRow {
  date: string;
  tool: string; // STOCK | GET_PROMOS | IMAGENES | PEDIDOS | ...
  count: number;
}

export interface ActivityHourlyRow {
  date: string;
  hour: number; // 0-23, hora local
  count: number; // mensajes en esa hora de ese día
}

export interface IntentDailyRow {
  date: string;
  intent: string; // saludo | pedido | precio | promo | horario | delivery | foto | otro
  count: number;
}

/** Resultado del cómputo de un lote de filas crudas, listo para upsert por cliente. */
export interface ComputeResult {
  metricsDaily: MetricsDailyRow[];
  productQueries: ProductQueryDailyRow[];
  toolUsage: ToolUsageDailyRow[];
  activityHourly: ActivityHourlyRow[];
  intentDaily: IntentDailyRow[];
}