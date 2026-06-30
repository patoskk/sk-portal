# SK Optimal — Portal del cliente

Dashboard web donde cada cliente entra con su login y ve **sus** métricas en vivo
(filtradas por fecha), con gráficos y oportunidades de mejora. Es la versión "viva"
del reporte semanal que genera la skill `metrics-pdf-report` — reutiliza su lógica de
métricas y su marca.

> Plan completo: `~/.claude/plans/quiero-crear-un-prtal-bright-puzzle.md`

## Arquitectura

```
Supabase de cada cliente (logs crudos, read-only)
        │  cron de cómputo (Vercel Cron / n8n) → corre lib/metrics (port de analyze.py)
        ▼
Supabase CENTRAL del portal  ← RLS por client_id (aislamiento en la base)
  · clients · user_clients · client_sources
  · metrics_daily · product_queries_daily · tool_usage_daily · activity_hourly · intent_daily
  · insights (oportunidades + prosa de Claude, semanal, con gate de revisión)
        ▼
Next.js en Vercel  ← cada cliente ve SOLO sus filas
```

## Estructura

| ruta | qué es |
|---|---|
| `lib/metrics/` | port fiel de `analyze.py` (parsers + cómputo **por día**) |
| `lib/brand.ts`, `app/globals.css` | tokens de marca SK Optimal (espejo de `web.css`) |
| `lib/supabase/{server,client,admin}.ts` | clientes Supabase (anon en front, service-role solo en backend) |
| `lib/data/dashboard.ts` | lee tablas resumen del rango y arma la forma de los gráficos |
| `app/dashboard/` | dashboard (server component) + filtro de fechas |
| `components/Charts.tsx` | gráficos Recharts con la paleta de marca |
| `app/api/cron/compute/` | recalcula métricas por cliente (horario) |
| `app/api/cron/insights/` | genera oportunidades con Claude (semanal) |
| `supabase/migrations/0001_init.sql` | tablas + RLS + auth hook |

## Setup

```bash
npm install

# 1. Crear el Supabase CENTRAL del portal y correr la migración:
#    supabase/migrations/0001_init.sql (SQL Editor o supabase db push)
# 2. Authentication → Hooks → habilitar "Custom Access Token" = public.custom_access_token_hook
# 3. Copiar variables:
cp .env.example .env.local   # completar URL/keys/CRON_SECRET

npm run dev   # http://localhost:3000
```

### Alta de un cliente (piloto)
1. `insert into clients (name, rubro, utc_offset) ...`
2. `insert into client_sources (client_id, supabase_url, table_name) ...`
   y la key de lectura en `SOURCE_KEY_<CLIENT_ID>` (env) o en Supabase Vault.
3. Crear el usuario en Auth y mapearlo: `insert into user_clients (user_id, client_id, role)`.
4. Disparar el cómputo una vez:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/compute`

## Seguridad (no negociable)
- **RLS activado en todas las tablas**; cada usuario ve solo su `client_id` (vía claim del JWT).
- **`service_role` solo en backend** (`lib/supabase/admin.ts`, rutas de cron). El frontend usa la `anon` key.
- Keys de lectura de cada cliente: **Supabase Vault** en producción (no en claro).
- `/api/cron/*` protegido por `CRON_SECRET`. Activar Deployment Protection en previews de Vercel.

## Verificación end-to-end
1. **Aislamiento**: con 2 clientes, logueado como A, confirmar (UI + query directa con anon key) que no se ven filas de B; revisar que ninguna service key aparezca en el bundle del navegador.
2. **Paridad de números**: comparar KPIs del portal contra el PDF de `metrics-pdf-report` para el mismo período (valida el port de `analyze.py`).
3. **Filtro de fechas**: cambiar el rango → KPIs/gráficos recalculan; conversión coherente.
4. **Insights**: correr `/api/cron/insights`, revisar oportunidades rankeadas por impacto; con `reviewed=false` no se muestran al cliente.
