# Nivel B · Estado y próximos pasos

Rama: **`nivel-b`** (no toca producción). Actualizado: 18 jun 2026.

## Hecho ✅
- **Fase 1 — Modelo de datos**: 12 tablas en Supabase (`0003_nivel_b_schema.sql`), aplicadas y
  verificadas. Transformación Base44→Supabase validada con datos reales. (docs 01, 02, 03)
- **Fase 2 — Adapter**: `src/api/adapter/*` imita el SDK de Base44 sobre Supabase/Workers,
  conmutable con `VITE_USE_SUPABASE`. **13 tests Vitest verdes** (`npm run test`). (doc 04)
- **Fase 3 — Funciones (grupo A + avisos = 15/34)**: Worker `functions/` desplegado en
  **https://menttio-functions.raul2000plgr.workers.dev** con helpers `db` (Supabase) y
  `auth` (verifica JWT de Supabase: requireUser/requireAdmin/requireCronOrAdmin). Portadas:
  - **Datos/Gmail/Admin** (sin secretos nuevos): `getPublicTeachers`, `setMeetLink`,
    `getRecordingLink`, `sendContactEmail` (✅ e2e, Gmail), `deleteUserProfile`,
    `createCorporateUser`, `registerTeacher`, `markCompletedClasses`, `cleanupUnpaidPremium`.
  - **Avisos (proxy a automations)**: `notifyN8N`, `notifyN8NBulk`, `notifyFileUpload`,
    `notifyClassPaid`, `notifyNuevoAlumno`, `notifyNuevoProfesor`.
  - Guardas validadas (401/403/400) sin crear datos reales. Tests: 17/17 verdes
    (adapter 13 + notify 4). Secretos cargados: SUPABASE_*, GOOGLE_SA_*, AUTOMATIONS_URL,
    WEBHOOK_SECRET, CRON_SECRET. (doc 05)

## Desplegado
- Worker funciones: `menttio-functions.raul2000plgr.workers.dev` (secretos cargados:
  SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_SA_CLIENT_EMAIL, GOOGLE_SA_PRIVATE_KEY).

## Secretos cargados en el Worker de funciones (18 jun)
SUPABASE_*, GOOGLE_SA_*, AUTOMATIONS_URL, WEBHOOK_SECRET, CRON_SECRET, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, GOOGLE_OAUTH_CLIENT_ID/SECRET, VAPID_PUBLIC_KEY/PRIVATE_KEY.
Frontend (Supabase publishable key, para `VITE_SUPABASE_ANON_KEY`): `sb_publishable_SIH6V31I3wSyrkY47w17GA_SDCzkMGp`.

## Funciones portadas: 32/34 — FASE 3 COMPLETA (lo funcional)
Todas desplegadas en el Worker de funciones y con sus guardas validadas (401/403/400/503/302).
Grupo A (9) + avisos (6) + chatAssistant (gated ANTHROPIC_API_KEY) + getVapidPublicKey +
Stripe completo (createCheckout, getSubscriptionInfo, getStripeConnectStatus, connectStripeAccount,
createTeacherSubscription, handleSubscriptionExempt, **stripeWebhook**, **deleteAccount**) +
Calendar completo (getGoogleOAuthUrl, toggleGoogleCalendar, getGoogleCalendarEvents,
syncGoogleCalendar, deleteGoogleCalendarEvent, googleOAuthCallback) + sendPushNotification.

Sin portar (a propósito): `debugGoogleCalendar` (debug, baja prioridad), `syncAllBookings` (obsoleto).

### Avisos sobre las pendientes de verificar (no bloquean, pero ojo en el corte)
- ⚠️ **VAPID keys** aportadas NO parecen base64url válidas → `sendPushNotification` no funcionará
  hasta corregirlas (la función ya está lista).
- ⚠️ **Stripe webhook endpoint** "mal configurado" (lo dijo el usuario) → revisar en Stripe y
  apuntarlo a `…workers.dev/stripeWebhook` con el `STRIPE_WEBHOOK_SECRET` correcto.
- **Redirect URI de Google** para Calendar: registrar `GOOGLE_OAUTH_REDIRECT_URI`
  (`…/googleOAuthCallback`) en el OAuth client de Google Cloud.
- Las funciones con tokens de usuario (Calendar) y destructivas (deleteAccount) están portadas
  pero **no probadas e2e** (necesitan un usuario real conectado / no se borran cuentas a ciegas).

## Bloqueado por config (Fases 4 y 5)
| Tarea | Necesita |
|---|---|
| **Fase 4 — Auth** | Configurar **Supabase Auth → Google** en el panel (con el Client ID/Secret aportados) + políticas RLS por usuario (migración a escribir) |
| Activar chat IA | `ANTHROPIC_API_KEY` (usuario lo dejó desactivado) |
| **Fase 5 — Hosting** | Crear **Cloudflare Pages** + PWA + dominio |

## Próximos pasos (cuando haya credenciales)
1. **Fase 4 — Auth** (la crítica): Supabase Auth + Google, migrar usuarios, políticas RLS por
   usuario, cablear `auth.*` del adapter. Solo entonces el adapter funciona e2e.
2. Completar funciones de los grupos B–E con sus secretos.
3. **Fase 5 — Pages + PWA**.
4. **Fase 6 — Corte**: cargar datos (runbook doc 03), conmutar `VITE_USE_SUPABASE=true`,
   apuntar dominio a Pages, baja de Base44.

## Funciones que quedan por portar (19/34, casi todas necesitan secretos)
- 🔑 Stripe (8): createCheckout, stripeWebhook, createTeacherSubscription, connectStripeAccount,
  getStripeConnectStatus, getSubscriptionInfo, handleSubscriptionExempt, deleteAccount.
- 🔑 Google OAuth de usuario (7): getGoogleOAuthUrl, googleOAuthCallback, syncGoogleCalendar,
  getGoogleCalendarEvents, deleteGoogleCalendarEvent, toggleGoogleCalendar, debugGoogleCalendar.
- 🔑 Push (2): sendPushNotification, getVapidPublicKey (VAPID).
- `syncAllBookings`: obsoleto.

**Ya escrita y desplegada, solo falta la key:** `chatAssistant` (→ API Claude, modelo Haiku).
Devuelve 503 hasta cargar `ANTHROPIC_API_KEY` con `wrangler secret put`. Total portado: **16/34**.
Los cron (markCompletedClasses, cleanupUnpaidPremium) se programarán en el Worker en el corte
(ahora Base44 los hace nativo y Supabase está vacío).
