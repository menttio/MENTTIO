# Nivel B · Migración de datos Base44 → Supabase (runbook)

> **Cuándo:** la carga masiva NO se hace ahora — Base44 sigue vivo y los datos cambian a diario.
> Se ejecuta **en el corte** (Fase 6), con una sincronización final. El esquema y la lógica de
> transformación ya están **validados con datos reales** (ver más abajo).

## Volumen (a 17 jun 2026)
- bookings: **127** (la mayor)
- teachers / students / subjects / reviews / availability / conversations / messages /
  notifications / push_subscriptions / trial_used / profiles(User): pequeñas (<≈30 c/u).

## Transformación Base44 → Supabase (validada)
Cada registro de Base44 trae campos internos que hay que adaptar:
- **descartar** `is_sample`.
- `created_date` → `created_at`
- `updated_date` → `updated_at`
- `created_by_id` → `created_by`
- conservar `id` (se reutiliza tal cual para preservar relaciones).
- los campos anidados (arrays/objetos) van directos a las columnas `jsonb`.

### Requisito de PostgREST (importante)
En un insert por lotes, **todas las filas deben tener exactamente las mismas claves**
(`PGRST102: All object keys must match`). Por eso, tras transformar, hay que **normalizar**:
calcular la unión de claves del lote y rellenar las que falten con `null`.

### Carga
- `POST {SUPABASE_URL}/rest/v1/{tabla}` con cabecera
  `Prefer: resolution=merge-duplicates,return=minimal` (upsert idempotente por `id`).
- Validado: insertadas 3 reservas reales, leídas de vuelta correctas (ids, acentos, fechas,
  enums, jsonb), y limpiadas. ✅

## Orden de migración (en el corte)
1. `subjects`, `profiles` (User), `teachers`, `students` (entidades base).
2. `availability`, `bookings` (dependen de teacher/student/subject).
3. `conversations` → `messages`.
4. `reviews`, `notifications`, `push_subscriptions`, `trial_used`.

## Mecanismo de lectura desde Base44
Los datos solo se leen vía el conector MCP de Base44 (`query_entities`, paginando con `skip`
para entidades grandes como bookings) o, alternativamente, una función Base44 temporal
`asServiceRole` que vuelque a Supabase server-side (evita pasar el dato por el cliente; se
decidirá en el corte según convenga). En ambos casos, la transformación y la carga son las de
arriba.

## Verificación post-migración
- Conteo por entidad: Base44 vs Supabase deben coincidir.
- Muestreo de integridad referencial (un booking → su teacher/student/subject existen).
