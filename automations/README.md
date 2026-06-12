# Menttio · Motor de automatizaciones (reemplazo de n8n)

Cloudflare Worker que sustituye a **n8n Cloud**. Recibe los mismos webhooks que enviaba
Base44, hace el trabajo con el **service account de Google** (Gmail, Drive, Admin SDK) y
guarda el registro de reservas en **Supabase (Postgres)** en lugar de en Google Sheets.

Todo gratuito: Cloudflare Workers (100k req/día), Supabase (capa gratuita), Google APIs
(sin coste por llamada).

---

## 0. Requisitos previos
- Cuenta gratuita de **Cloudflare** y `npm i -g wrangler` (o usar `npx wrangler`).
- Cuenta gratuita de **Supabase**.
- El **service account de Google** que ya usabas en n8n (`clientEmail`, `privateKey`,
  impersonando `menttio@menttio.com`, dominio `menttio.com`).

> ⚠️ **Seguridad**: la clave privada del service account aparece en los exports de
> `n8n/*.json`. Esa carpeta está en `.gitignore` y NO debe subirse a git. Cuando termine
> la migración, **rota esa clave** en Google Cloud (crea una nueva y borra la antigua),
> porque ha estado dentro de archivos de configuración.

---

## 1. Supabase
1. Crea un proyecto en https://supabase.com (región Europa).
2. Ve a **SQL Editor** y ejecuta el contenido de `../supabase/migrations/0001_init.sql`.
3. Apunta de **Project Settings → API**:
   - `Project URL`  → será `SUPABASE_URL`
   - `service_role key` (¡secreta!) → será `SUPABASE_SERVICE_KEY`

---

## 2. Ampliar la delegación del service account (importante)
En n8n el service account solo tenía scopes de Admin Directory. El Worker además envía
Gmail y usa Drive, así que hay que autorizar esos scopes:

1. **Google Admin Console** → *Seguridad → Controles de API → Delegación de todo el dominio*.
2. Edita el cliente (el `Client ID` del service account) y asegúrate de que tiene **todos** estos scopes:
   ```
   https://www.googleapis.com/auth/admin.directory.user,
   https://www.googleapis.com/auth/admin.directory.group,
   https://www.googleapis.com/auth/admin.directory.group.member,
   https://www.googleapis.com/auth/gmail.send,
   https://www.googleapis.com/auth/drive
   ```
3. En **Google Cloud Console** habilita las APIs: *Gmail API*, *Google Drive API*, *Admin SDK*.
4. La carpeta `Profesores` de Drive (`DRIVE_ROOT_PROFESORES`) debe ser accesible por
   `menttio@menttio.com` (la cuenta impersonada). Si no, compártela con ella.

---

## 3. Desplegar el Worker
```bash
cd automations
npm install

# Login en Cloudflare (abre el navegador)
npx wrangler login

# Carga los secretos (uno por uno; pega el valor cuando lo pida)
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put GOOGLE_SA_CLIENT_EMAIL
npx wrangler secret put GOOGLE_SA_PRIVATE_KEY      # la clave COMPLETA, con \n o saltos reales
npx wrangler secret put WEBHOOK_SECRET             # inventa un secreto largo y aleatorio
npx wrangler secret put CRON_SECRET                # otro secreto largo y aleatorio

# Despliega
npx wrangler deploy
```
Wrangler te dará la URL pública, por ejemplo:
`https://menttio-automations.TU-SUBDOMINIO.workers.dev`

Las variables NO secretas (dominio, cuenta a impersonar, carpeta Drive, inbox y
`BASE44_FUNCTIONS_URL`) están en `wrangler.toml` → ajústalas ahí si cambian y vuelve a desplegar.

### Desarrollo local
Copia `.dev.vars.example` a `.dev.vars`, rellena los valores y ejecuta `npm run dev`.

---

## 4. Repuntar Base44 al Worker (configuración, sin tocar código)
En el panel de Base44 → *Environment Variables*, cambia las URLs `N8N_*` para que apunten
al Worker, **incluyendo `?key=EL_WEBHOOK_SECRET`** al final (así el secreto viaja en la URL
y no hay que modificar las funciones):

| Variable en Base44 (env)        | Nuevo valor (Worker)                                   |
|---------------------------------|--------------------------------------------------------|
| `N8N_WEBHOOK_URL`               | `https://…workers.dev/reserva?key=SECRET`              |
| `N8N_CANCEL_WEBHOOK_URL`        | `https://…workers.dev/reserva/cancelada?key=SECRET`    |
| `N8N_MODIFY_WEBHOOK_URL`        | `https://…workers.dev/reserva/modificada?key=SECRET`   |
| `N8N_CLASS_PAID_WEBHOOK_URL`    | `https://…workers.dev/clase-pagada?key=SECRET`         |
| `N8N_FILE_UPLOAD_WEBHOOK_URL`   | `https://…workers.dev/subir-archivos?key=SECRET`       |
| `N8N_NUEVO_ALUMNO_WEBHOOK_URL`  | `https://…workers.dev/nuevo-alumno?key=SECRET`         |
| `N8N_NUEVO_PROFESOR_WEBHOOK_URL`| `https://…workers.dev/nuevo-profesor?key=SECRET`       |
| `N8N_CREATE_USER_WEBHOOK_URL`   | `https://…workers.dev/registrar-profesor?key=SECRET`   |
| `N8N_DELETE_TEACHER_WEBHOOK_URL`| `https://…workers.dev/eliminar-profesor?key=SECRET`    |

Además, en Base44 añade la variable **`CRON_SECRET`** (mismo valor que el del Worker) para
que los cron puedan invocar las funciones internas.

### Frontend (informe mensual)
`src/pages/MyStudents.jsx` ahora usa `VITE_AUTOMATIONS_URL`. Define esa variable de entorno
en Base44 con `https://…workers.dev` (sin barra final). El informe se llama directamente
desde el navegador, por eso esa ruta no lleva secreto (igual que antes en n8n).

---

## 5. Cron (sustituye al scheduler de n8n)
El Worker ya trae *Cron Triggers* (ver `wrangler.toml`) que llaman a las funciones Base44:
- cada 15 min → `markCompletedClasses`
- cada hora → `cleanupUnpaidPremium`
- cada 30 min → `syncAllBookings`

Para que funcionen, pon en `wrangler.toml` la variable `BASE44_FUNCTIONS_URL` con la base
de las backend functions de tu app (la URL que usa `functions.invoke` por HTTP, p. ej.
`https://app.base44.com/api/apps/694471e9c204eb0088437b85/functions`) y vuelve a desplegar.
El Worker añade la cabecera `x-cron-secret`; `markCompletedClasses` y `cleanupUnpaidPremium`
ya aceptan ese secreto (ver cambios en `base44/functions/...`).

---

## 6. Migración progresiva (sin cortar nada) y baja de n8n
1. Despliega el Worker y ejecuta el SQL de Supabase.
2. **Canary**: repunta SOLO `N8N_NUEVO_ALUMNO_WEBHOOK_URL` al Worker. Da de alta un alumno
   de prueba y comprueba que llega el email.
3. Prueba el flujo crítico `registrar-profesor` (crea la cuenta Workspace y devuelve
   `{status:'ok', email}`); verifica que Base44 crea el Teacher.
4. Repunta el resto de reservas y comprueba las filas en Supabase (tablas `bookings_ledger`
   y `class_log`).
5. Prueba el informe mensual desde *Mis Alumnos*.
6. Observa 24–48h en paralelo (`npx wrangler tail` para ver logs en vivo).
7. Cuando todo funcione: **da de baja la suscripción de n8n Cloud** y rota la clave del
   service account.

---

## Rutas del Worker
| Ruta                          | Origen                | Secreto |
|-------------------------------|-----------------------|---------|
| `POST /reserva`               | Base44 notifyN8N      | sí      |
| `POST /reserva/cancelada`     | Base44 notifyN8N      | sí      |
| `POST /reserva/modificada`    | Base44 notifyN8N      | sí      |
| `POST /clase-pagada`          | Base44 notifyClassPaid| sí      |
| `POST /subir-archivos`        | Base44 notifyFileUpload | sí    |
| `POST /nuevo-alumno`          | Base44 notifyNuevoAlumno | sí   |
| `POST /nuevo-profesor`        | Base44 notifyNuevoProfesor | sí |
| `POST /registrar-profesor`    | Base44 registerTeacher / createCorporateUser | sí |
| `POST /eliminar-profesor`     | Base44 deleteAccount / cleanupUnpaidPremium | sí |
| `POST /informe-progreso`      | Frontend (MyStudents) | no      |
