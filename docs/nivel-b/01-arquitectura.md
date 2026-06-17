# Nivel B · Arquitectura objetivo (salir de Base44)

Estado: **en construcción** (rama `nivel-b`, no se despliega a producción hasta el corte).

## Principio rector
Sustituir Base44 **sin perder funcionalidad** y, donde se pueda, mejorando. Migración por
**fases pequeñas, verificables y reversibles**, con Base44 funcionando en paralelo hasta el corte.

## Stack objetivo

| Capa | Antes (Base44) | Después |
|---|---|---|
| Frontend web + móvil (PWA) | Base44 hosting | **Cloudflare Pages** (mismo código React/Vite) |
| Base de datos | Entities Base44 | **Supabase (Postgres)** |
| Autenticación + roles | `base44.auth` | **Supabase Auth** (email + Google OAuth) |
| Backend functions | Deno en Base44 | **Cloudflare Workers** (ya operativo desde Nivel A) |
| Cron | Base44 nativo | **Cloudflare cron** |
| Archivos | Base44 storage | **Supabase Storage** |
| Chat IA | LLM Base44 (créditos) | **API Claude directa** |

## Decisiones de diseño tomadas
1. **Rama aislada `nivel-b`.** `main` despliega la app viva en Base44; el Nivel B no toca `main`
   hasta el corte final.
2. **IDs `text` preservando los de Base44.** Evita remapear las ~mil referencias cruzadas al
   migrar. Filas nuevas: `gen_random_uuid()::text`.
3. **Campos anidados → `jsonb`** (no se normalizan de momento; replican el modelo documento de
   Base44 y reducen el riesgo de la migración). Normalización = mejora posterior opcional.
4. **RLS activado desde el principio**, pero las políticas ligadas al usuario se añaden en la
   Fase 4 (cuando exista Supabase Auth). Hasta entonces solo accede la `service_role`/Worker.
5. **Capa adaptadora** (`src/api/data.js`) que imita el SDK de Base44 → permite cambiar el origen
   de datos sin reescribir las ~300 llamadas del frontend de golpe.

## Fases (ver PLAN-NIVEL-B.md)
1. **Modelo de datos** (esta fase) — tablas Supabase + migración de datos. No toca producción.
2. **Adapter de datos** en el frontend.
3. **Funciones backend → Workers** (incl. chat IA → Claude).
4. **Auth** (la pieza crítica).
5. **Hosting + PWA**.
6. **Corte y baja de Base44.**

## Tests y calidad
- **Migración SQL**: verificación de que todas las tablas/columnas existen tras aplicarla.
- **Migración de datos**: comprobación de conteos e integridad referencial Base44 ↔ Supabase.
- **Workers**: tests con Vitest (handlers puros + lógica de cron) — se añaden por fase.
- Cada fase se valida en vivo antes de pasar a la siguiente.
