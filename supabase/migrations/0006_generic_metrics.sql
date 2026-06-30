-- Métricas genéricas (rubro-agnósticas): valen para cualquier agente, sin importar
-- los nombres de sus herramientas. Las columnas viejas específicas de almacén quedan
-- pero ya no se usan (el cron deja de escribirlas).
alter table public.metrics_daily add column if not exists messages_agent int not null default 0;
alter table public.metrics_daily add column if not exists tool_calls int not null default 0;
alter table public.metrics_daily add column if not exists no_result int not null default 0;
