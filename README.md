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

## Producción

- **App:** https://sk-clientportal.vercel.app · repo `patoskk/sk-portal` · Vercel `sk-clientportal` (Hobby).
- **Cron (límite Hobby = 1×/día):** `compute` 0 11 * * * · `insights` lunes 12 UTC. Para más frecuencia: Vercel Pro o un workflow n8n que pegue al endpoint con el `CRON_SECRET`.
- **Env vars** (en Vercel y `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `ANTHROPIC_API_KEY`, y un `SOURCE_KEY_<CLIENT_ID>` por cliente.

## Setup (entorno nuevo)

```bash
npm install
# 1. Crear el Supabase CENTRAL y correr supabase/migrations/0001_init.sql y 0002_auth_hook_rls.sql (SQL Editor)
# 2. Authentication → Hooks → habilitar "Custom Access Token" = public.custom_access_token_hook
# 3. cp .env.example .env.local   # completar URL/keys/CRON_SECRET
npm run dev   # http://localhost:3000
```

## Alta de un cliente nuevo

Cada cliente tiene su **propio** Supabase (la fuente). Pasos:

```bash
# 1) Alta del cliente + fuente + usuario. Editá CLIENT_ID/URL/tabla en el script
#    (o adaptá setup-pilot.ts). client_id es un uuid que vos generás.
npx tsx scripts/setup-pilot.ts            # da de alta cliente, fuente y un usuario de prueba
npx tsx scripts/add-user.ts <email>       # crea el usuario real del cliente (devuelve contraseña)

# 2) Key de LECTURA de la fuente: usar la SECRET del proyecto del cliente
#    (la publishable NO sirve si la tabla tiene RLS). Cargar como:
#    SOURCE_KEY_<CLIENT_ID_EN_MAYUS_CON_GUION_BAJO>=sb_secret_...   (en .env.local y en Vercel)

# 3) Activar RLS en la tabla de conversaciones del cliente (SQL Editor de SU proyecto):
#    alter table public.<tabla> enable row level security;
#    (sin policies = solo service/secret accede; la publishable deja de leer)

# 4) Primer cómputo + insights:
curl -H "Authorization: Bearer $CRON_SECRET" https://sk-clientportal.vercel.app/api/cron/compute
npx tsx scripts/gen-insights.ts <client_id>      # genera oportunidades (reviewed=false)
npx tsx scripts/publish-insights.ts <client_id>  # publica al cliente (reviewed=true)
```

**Verificación:** `npx tsx scripts/verify.ts` chequea que el usuario vea sus filas y que no haya fugas de otros clientes (RLS).

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
