# Nivel B · Modelo de datos (entidades Base44 → tablas Supabase)

Migración SQL: `supabase/migrations/0003_nivel_b_schema.sql`.

## Convenciones
- **id**: `text` (PK). Al migrar se conservan los ids actuales de Base44 (formato hex de 24).
  Filas nuevas: `gen_random_uuid()::text`.
- **created_at / updated_at**: `timestamptz` con trigger automático de `updated_at`.
- **created_by**: email del creador (equivalente a `created_by` de Base44).
- **Campos anidados** (arrays/objetos): `jsonb`.
- **Enums**: `text` + `CHECK`.
- **RLS**: activado en todas; políticas por usuario → Fase 4 (auth).

## Tablas

| Tabla | Entidad Base44 | Notas |
|---|---|---|
| `profiles` | User (built-in) | email, full_name, role (user/admin). Se enlazará a `auth.users` en Fase 4. |
| `subjects` | Subject | name, icon, description |
| `teachers` | Teacher | RLS por `user_email`; `subjects`, tours, suscripción, Stripe, tokens Google en columnas/jsonb |
| `students` | Student | `assigned_teachers` jsonb |
| `availability` | Availability | `time_slots` jsonb; regular/exception |
| `bookings` | Booking | entidad central; `enrolled_students`, `files` jsonb. Sustituye al `bookings_ledger` de Nivel A en el corte |
| `conversations` | Conversation | contadores de no leídos |
| `messages` | Message | FK lógica a `conversations` |
| `notifications` | Notification | tipos de aviso in-app |
| `reviews` | Review | rating 1-5 |
| `push_subscriptions` | PushSubscription | `subscription` jsonb (Web Push) |
| `trial_used` | TrialUsed | control de prueba gratuita usada |

## Relaciones (lógicas, por id en `text`)
- `teachers.user_email` / `students.user_email` → `profiles.email`
- `bookings.teacher_id` → `teachers.id`; `bookings.student_id` → `students.id`; `bookings.subject_id` → `subjects.id`
- `availability.teacher_id` → `teachers.id`
- `messages.conversation_id` → `conversations.id`
- `reviews.teacher_id/student_id/booking_id` → respectivas
- No se ponen FKs duras todavía para no bloquear la migración de datos (orden de inserción);
  se pueden añadir tras migrar si se desea.

## Pendiente de esta fase
1. Aplicar `0003` en Supabase.
2. Verificar que existen las 12 tablas con sus columnas.
3. Migrar datos Base44 → Supabase (script vía MCP `query_entities` + insert, conservando ids),
   y comprobar conteos e integridad.
