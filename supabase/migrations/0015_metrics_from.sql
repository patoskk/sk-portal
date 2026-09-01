-- Piso de métricas por cliente.
--
-- Por qué NO alcanza con borrar las filas: el cómputo es incremental, pero la
-- tabla de conversaciones del cliente NUNCA se borra. Un recómputo completo
-- (`update client_sources set last_synced_at = null`, que es lo que hacemos a mano
-- al activar tipos de conversión — ver 0010) reconstruiría el período de prueba
-- entero, en silencio y sin un solo error.
--
-- Con el piso puesto, ese período no puede volver: el cómputo descarta cualquier
-- día anterior antes de escribir. Lo setea el borrado por fecha del panel Admin.

alter table public.clients add column if not exists metrics_from date;

comment on column public.clients.metrics_from is
  'Piso de métricas: el cómputo descarta cualquier día anterior a esta fecha. Lo escribe el borrado por fecha del panel Admin (corte prueba/garantía → producción). Solo avanza, nunca retrocede. Null = sin piso.';
