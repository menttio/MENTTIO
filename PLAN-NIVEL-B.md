# Plan Nivel B — Independizar Menttio de Base44

> Objetivo: dejar de depender de Base44 (y de sus créditos) sin perder funcionalidad,
> incluida la versión móvil. Continuación natural del Nivel A (salida de n8n), que ya dejó
> montada la base: **Supabase** (Postgres) + **Cloudflare Workers** + Google (SA) + Gmail.

## 1. Qué hace Base44 hoy por Menttio (lo que hay que sustituir)

| Capa | Hoy (Base44) | Sustituto propuesto | Dificultad |
|---|---|---|---|
| Alojamiento web + versión móvil | Base44 hosting | Cloudflare Pages (o Vercel) | 🟢 Baja |
| Base de datos | Entities de Base44 (~12) | Supabase (Postgres) | 🟡 Media |
| **Autenticación + roles + Google login** | `base44.auth` | Supabase Auth | 🔴 Alta |
| Funciones backend (34) | Deno en Base44 | Cloudflare Workers | 🟡 Media |
| Cron de mantenimiento | Base44 nativo | Cloudflare cron (patrón ya hecho) | 🟢 Baja |
| Archivos subidos | Base44 storage | Supabase Storage / R2 | 🟢 Baja |
| Chat con IA (`chatAssistant`/InvokeLLM) | LLM de Base44 (gasta créditos) | API Claude directa | 🟡 Media |
| Constructor con IA | Base44 builder | Mantenimiento propio (con Claude) | — |

### Inventario real (medido en el código)
- **Entidades (~12):** Teacher (88 refs), Booking (57), Student (38), Notification (22),
  Conversation (11), Availability (9), TrialUsed (7), Review (7), Subject (6),
  PushSubscription (6), User (built-in).
- **34 funciones backend.** Grupos: Stripe (8), Google OAuth/Calendar (7), Push/VAPID (7),
  LLM/chat (chatAssistant + 5 usos de InvokeLLM en frontend), notificaciones/webhooks
  (ya van al Worker), cron (Base44 nativo), gestión de usuarios, varios.
- **Frontend:** 153 archivos, **~300 llamadas al SDK** (188 a `entities`, 60 a `auth`,
  53 a `functions.invoke`, 5 a `integrations`).

> Conclusión: ninguna feature de usuario es "imposible" de replicar — todo es tecnología
> estándar. El coste es **volumen de trabajo** (los ~300 puntos de llamada) y **riesgo en el
> auth**, no pérdida de funcionalidad. La versión móvil es web responsive/PWA: viaja con el código.

## 2. Estrategia para minimizar riesgo

1. **Capa de compatibilidad (adapter).** Crear un módulo `src/api/data.js` con la **misma forma**
   que el SDK de Base44 (`entities.X.list/filter/create/update`, `auth.me()`,
   `functions.invoke`) pero por dentro hablando con Supabase/Workers. Así se cambia **el import
   en ~un sitio** en vez de reescribir 300 llamadas a mano. Migración gradual, no "big bang".
2. **Doble escritura temporal.** Durante la transición, escribir en Base44 **y** en Supabase para
   poder volver atrás y comparar.
3. **El auth, lo último y con red.** Es lo que más rompe; se hace cuando todo lo demás ya funciona.
4. **Fases pequeñas, verificables, reversibles** (como hicimos con n8n).

## 3. Fases

### Fase 0 — Base (✅ ya hecha en Nivel A)
Supabase + Workers operativos, Gmail/Drive/Calendar/Admin vía service account.

### Fase 1 — Modelo de datos en Supabase
- Crear las ~12 tablas (con relaciones y RLS) reflejando las entidades.
- Script de migración de datos Base44 → Supabase (vía MCP `query_entities` + insert, como el
  backfill que ya hicimos).
- Verificación de integridad (conteos, relaciones).
- **Esfuerzo: medio. Riesgo: bajo** (no afecta a producción todavía).

### Fase 2 — Adapter de datos en el frontend
- `src/api/data.js` que imita el SDK pero usa Supabase (PostgREST/supabase-js).
- Cambiar el import de `@/api/base44Client` por el adapter, entidad a entidad.
- **Esfuerzo: alto (volumen). Riesgo: medio.**

### Fase 3 — Funciones backend → Workers
- Portar las 34 funciones por grupos:
  - Stripe (8): portables casi tal cual (Stripe SDK funciona en Workers).
  - Google OAuth/Calendar (7): ya tenemos el patrón de auth Google en el Worker.
  - Push/VAPID (7): Web Push desde Worker.
  - LLM/chat: pasar de InvokeLLM (créditos Base44) a **API de Claude directa** → ahorro de créditos.
  - Resto: setMeetLink, getRecordingLink, sendContactEmail, etc.
- **Esfuerzo: alto. Riesgo: medio** (Stripe webhooks y OAuth requieren cuidado).

### Fase 4 — Autenticación (la pieza crítica) 🔴
- Supabase Auth: email/contraseña + **Google OAuth** (alumnos y profesores) + roles
  (alumno/profesor/admin) + las cuentas corporativas `@menttio.com`.
- Migrar usuarios existentes (con su método de login) sin obligar a re-registrarse.
- Reemplazar los 60 usos de `base44.auth` por el wrapper de Supabase Auth.
- **Esfuerzo: alto. Riesgo: ALTO.** Es donde se decide el éxito; se hace con doble run y plan
  de rollback.

### Fase 5 — Alojamiento + PWA
- Desplegar la web en **Cloudflare Pages**, apuntar `menttio.com`.
- Configurar **PWA instalable** (manifest + service worker, p. ej. `vite-plugin-pwa`) para
  mantener/ mejorar la experiencia "app móvil".
- **Esfuerzo: bajo. Riesgo: bajo.**

### Fase 6 — Corte y baja de Base44
- Observación en paralelo, cutover por fases, y baja final de Base44.
- **Riesgo: gestionable si las fases previas se validaron.**

## 4. Orden recomendado y "quick wins"
1. Fase 1 (datos) + Fase 3 parcial (mover el **chat IA** a Claude → corta ya el gasto de créditos
   del LLM, que es de los pocos costes recurrentes que quedan).
2. Fase 2 (adapter) en paralelo.
3. Fase 4 (auth) cuando lo demás esté sólido.
4. Fase 5 + 6.

## 5. Valoración honesta
- **Sí se puede, sin perder funcionalidad de usuario** (móvil incluido).
- Es **bastante más grande que la salida de n8n** (≈ semanas de trabajo por fases, no días),
  por el volumen (~300 puntos de SDK) y el riesgo del auth.
- **Decisión económica:** merece la pena si los créditos de Base44 (hosting + funciones +
  entities + auth + LLM + builder) pesan lo suficiente frente al esfuerzo. El gasto recurrente
  más "atacable" rápido es el **LLM del chat** (Fase 3 parcial).
- **No empezar hasta cerrar n8n** (baja + rotación de claves).
