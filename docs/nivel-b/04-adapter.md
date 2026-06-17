# Nivel B · Fase 2 — Adapter de datos (SDK Base44 → Supabase/Workers)

## Idea
Un módulo con la **misma forma** que el cliente de Base44 (`entities`/`auth`/`functions`/
`integrations`) pero respaldado por Supabase + Cloudflare Workers. Así el frontend **no cambia
sus ~300 llamadas**: solo se conmuta un flag.

## Conmutación (un solo punto)
`src/api/base44Client.js` exporta `base44` eligiendo según `VITE_USE_SUPABASE`:
- ausente / `false` → SDK de Base44 (comportamiento actual, **intacto**).
- `true` → adapter de Supabase.

## Archivos
- `src/api/supabaseClient.js` — cliente supabase-js (clave publishable/anon; RLS controla acceso).
- `src/api/adapter/fieldMap.js` — traducción de campos `created_date↔created_at`,
  `updated_date↔updated_at`, `created_by_id↔created_by` (frontend sigue usando los nombres Base44).
- `src/api/adapter/entities.js` — `makeEntity` con `filter/get/list/create/update/delete`
  (filtros por igualdad — la app no usa operadores Mongo). `ENTITY_TABLES` mapea las 11 entidades.
- `src/api/adapter/auth.js` — `me/isAuthenticated/redirectToLogin/logout/updateMe` sobre Supabase Auth.
- `src/api/adapter/functions.js` — `invoke(name,payload)` → Worker (con token de sesión).
- `src/api/adapter/integrations.js` — `Core.SendEmail/InvokeLLM/UploadFile` → Worker.
- `src/api/adapter/index.js` — ensambla `createSupabaseAdapter()`.

## Tests
`src/api/adapter/__tests__/adapter.test.js` (Vitest) — 13 tests verdes: mapeo de campos,
sort, filtros por igualdad, CRUD, y el mapa entidad→tabla. Ejecutar: `npm run test`.

## Variables de entorno (frontend, Nivel B)
```
VITE_USE_SUPABASE=true                 # activa el adapter
VITE_SUPABASE_URL=https://hvwwmjpjzmxzlncfxnph.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key de Supabase>   # pública por diseño
VITE_FUNCTIONS_URL=<base de las funciones en el Worker>
```

## Dependencias de otras fases (para que el adapter funcione end-to-end)
- **Fase 3** (funciones en Workers) → `functions.invoke` e `integrations` necesitan los endpoints.
- **Fase 4** (auth) → `auth.*` y las políticas RLS para que `entities` lea/escriba con permisos
  por usuario. Hasta entonces el adapter está construido y unit-tested, pero el e2e real espera auth.
- **Datos** → se cargan en el corte (Fase 6).

## Estado
✅ Construido y unit-tested. Pendiente: configurar las env vars (incl. la anon key) y completar
Fases 3/4 para el funcionamiento end-to-end.
