# Nivel B · Fase 3 — Funciones backend → Cloudflare Workers

Las 34 funciones Deno de Base44 se portan a un Worker dedicado (`functions/`, "menttio-functions").
El frontend las llama vía el adapter (`functions.invoke` → `VITE_FUNCTIONS_URL/{name}`), con el
token de sesión de Supabase en `Authorization` para autenticar.

## Patrón de porte
- `base44.asServiceRole.entities.X` → Supabase (service key) vía un helper `db`.
- `base44.auth.me()` (verificación de usuario) → verificar el **JWT de Supabase** del header
  `Authorization` (helper `requireUser`).
- Respuestas con la misma forma que esperaba el frontend.

## Inventario y dependencias (✅ = portable ya; 🔑 = necesita secreto que ahora no tengo)

### A. Solo Supabase + Google SA (Gmail/Drive/Calendar/Admin) — ✅ portables ya
El Worker ya tiene el service account de Google y la service key de Supabase.
| Función | Acción | Notas |
|---|---|---|
| `getPublicTeachers` | leer profesores públicos | Supabase read |
| `setMeetLink` | guardar meet_link en booking | Supabase update |
| `getRecordingLink` | enlace de grabación | en Nivel B: leer `bookings.recording_url` (Supabase) en vez de la hoja |
| `sendContactEmail` | email de contacto | Gmail (Worker) |
| `markCompletedClasses` | marcar clases pasadas completed | Supabase update (cron) |
| `cleanupUnpaidPremium` | borrar cuentas premium impagadas | Supabase + Admin SDK (Worker) |
| `registerTeacher` | crear cuenta Workspace + Teacher | Admin SDK (Worker) + Supabase |
| `createCorporateUser` | crear cuenta Workspace | Admin SDK (Worker) |
| `deleteUserProfile` | borrar perfil | Supabase + Admin SDK |
| `getVapidPublicKey` | devolver clave pública VAPID | pública; trivial |

### B. Stripe — 🔑 necesita `STRIPE_SECRET_KEY` (+ `STRIPE_WEBHOOK_SECRET`)
`createCheckout`, `stripeWebhook`, `createTeacherSubscription`, `connectStripeAccount`,
`getStripeConnectStatus`, `getSubscriptionInfo`, `handleSubscriptionExempt`. (Stripe SDK funciona
en Workers.) `deleteAccount` también toca Stripe + Workspace + Supabase.

### C. Google OAuth de usuario (calendario por profesor) — 🔑 `GOOGLE_OAUTH_CLIENT_ID/SECRET`
`getGoogleOAuthUrl`, `googleOAuthCallback`, `syncGoogleCalendar`, `getGoogleCalendarEvents`,
`deleteGoogleCalendarEvent`, `toggleGoogleCalendar`, `debugGoogleCalendar`.
(OJO: distinto del service account; es el OAuth con el que cada profesor conecta SU Google Calendar.)

### D. Push — 🔑 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
`sendPushNotification` (Web Push desde Worker). `getVapidPublicKey` solo necesita la pública.

### E. Chat IA — 🔑 `ANTHROPIC_API_KEY`
`chatAssistant`: pasar del LLM de Base44 (créditos) a la **API de Claude** directa. Quick win de
ahorro, pero requiere la API key de Anthropic.

### F. Avisos (ya cubiertos por el Worker de automations / Nivel A)
`notifyN8N`, `notifyN8NBulk`, `notifyClassPaid`, `notifyFileUpload`, `notifyNuevoAlumno`,
`notifyNuevoProfesor`: en Nivel A ya van al Worker. En Nivel B el adapter puede llamarlos
directamente. `syncAllBookings`: queda **obsoleto** (sincronizaba a las hojas).

## Secretos necesarios para completar la Fase 3 (a aportar por el usuario)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ANTHROPIC_API_KEY`. (Hoy son env vars de Base44.)

## Estrategia autónoma
Se construye y testea ya el **grupo A** (no necesita secretos nuevos). Los grupos B–E quedan
**escritos/preparados** con placeholders de env vars y a la espera de los secretos (no se bloquea
el avance: el código queda listo para activar cuando lleguen las claves).
