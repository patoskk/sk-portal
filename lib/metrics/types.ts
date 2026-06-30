// Contrato de las tablas resumen del portal (grano DIARIO, rubro-agnóstico).
// Sirve para CUALQUIER agente: no depende de nombres de herramientas específicos.

export interface MetricsDailyRow {
  date: string; // YYYY-MM-DD (hora local del cliente)
  conversations: number; // sesiones distintas activas ese día
  messages_human: number; // mensajes del cliente
  messages_agent: number; // mensajes del agente (ai)
  messages_total: number;
  tool_calls: number; // acciones del agente (todas las herramientas, cualquier nombre)
  conversions: number; // eventos clave detectados (mensajes de cierre + tools de cierre)
  conversion_sessions: number; // sesiones distintas con al menos un evento clave (≈ pedidos)
  no_result: number; // consultas del agente que no devolvieron resultado (genérico)
  errors: number; // fallos de herramientas
  tool_results: number; // denominador de la tasa de error
  response_sum_sec: number; // sumar / response_count para promediar sobre el rango
  response_count: number;
}

export interface ToolUsageDailyRow {
  date: string;
  tool: string; // el nombre tal cual lo usa el agente (STOCK, BQ_HUMANO, lo que sea)
  count: number;
}

export interface ActivityHourlyRow {
  date: string;
  hour: number; // 0-23, hora local
  count: number; // mensajes en esa hora de ese día
}

export interface IntentDailyRow {
  date: string;
  intent: string;
  count: number;
}

export interface ComputeResult {
  metricsDaily: MetricsDailyRow[];
  toolUsage: ToolUsageDailyRow[];
  activityHourly: ActivityHourlyRow[];
  intentDaily: IntentDailyRow[];
}
