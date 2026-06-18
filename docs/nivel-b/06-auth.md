# Nivel B · Fase 4 — Autenticación (Supabase Auth)

## Modelo
- **Login con Google** vía Supabase Auth (proveedor configurado en el panel con el OAuth client de
  Menttio). Email/contraseña queda disponible también (Supabase Auth lo soporta).
- Al registrarse un usuario, un **trigger** (`handle_new_user`) crea su fila en `profiles`
  (vinculada por **email**). El rol por defecto es `user`; los admin se marcan a mano
  (`update profiles set role='admin' where email='...'`).
- Los perfiles de dominio (`teachers`, `students`) se vinculan por **`user_email` = email del
  usuario**. Por eso, al migrar datos en el corte, no hay que remapear ids de usuario: el email es
  la clave de unión.

## RLS (migración `0004_rls_y_auth.sql`)
La `service_role` (Workers/funciones) **bypassa** RLS. Las políticas aplican al frontend (anon key
+ JWT del usuario):
- **Públicos para usuarios autenticados** (navegación): `subjects`, `teachers`, `availability`,
  `reviews` → SELECT a cualquiera logueado; escritura solo dueño/admin.
- **Privados por participante/propietario**: `bookings`, `conversations`, `messages`,
  `notifications`, `push_subscriptions`, `students` (propio, admin, o profesor con clase),
  `profiles` (propio/admin), `trial_used` (admin).
- Helper `is_admin()` (lookup en profiles por email).

## Migración de usuarios existentes
- **Usuarios de Google**: simplemente **inician sesión con Google** en la app nueva → Supabase Auth
  crea su `auth.users` + `profiles` (trigger) y queda vinculado a su `teacher/student` por email.
  No requiere importación manual.
- **Usuarios de email/contraseña** (si los hay): necesitarán un **reset de contraseña** la primera
  vez (flujo de Supabase Auth), o iniciar con Google si su email coincide.

## Cableado en el frontend (adapter)
`src/api/adapter/auth.js` ya implementa `me/isAuthenticated/redirectToLogin/logout/updateMe` sobre
`supabase.auth`. Con el flag `VITE_USE_SUPABASE=true` el front usa esto en vez de Base44. El e2e
real se valida en la Fase 5 (frontend desplegado en Pages con las env vars).

## Pendiente de esta fase
1. Aplicar `0004_rls_y_auth.sql` en Supabase.
2. Marcar el/los admin: `update public.profiles set role='admin' where email='<tu_email_admin>';`
   (tras el primer login, o insertando el profile).
3. Validar login e2e cuando el frontend esté desplegado (Fase 5).
