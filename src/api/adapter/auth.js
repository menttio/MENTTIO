// Autenticación compatible con base44.auth, respaldada por Supabase Auth.
// NOTA: la configuración completa (proveedor Google en Supabase, enlace con la tabla `profiles`,
// migración de usuarios) se cierra en la Fase 4. Aquí queda la interfaz y la lógica base.
import { fromDbRow } from "./fieldMap";

export function makeAuth(supabase) {
  // Devuelve el usuario actual con la forma que espera el frontend (email, full_name, role, id).
  async function me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    // Perfil ampliado (full_name, role). Sin .single() para NO crashear si aún no existe la fila.
    let profile = null;
    try {
      const { data } = await supabase.from("profiles").select("*").eq("email", user.email).limit(1);
      profile = data && data[0];
    } catch (e) { /* perfil opcional */ }
    return {
      id: user.id,
      email: user.email,
      role: profile?.role || "user",
      ...(profile ? fromDbRow(profile) : {}),
    };
  }

  async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  // Login con Google (Supabase OAuth). redirectTo vuelve a la app tras autenticar.
  async function redirectToLogin(redirectTo = window.location.origin) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // Actualiza el perfil del usuario actual.
  async function updateMe(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const { toDbRow } = await import("./fieldMap");
    const { data: updated, error } = await supabase
      .from("profiles").update(toDbRow(data)).eq("email", user.email).select().single();
    if (error) throw error;
    return fromDbRow(updated);
  }

  return { me, isAuthenticated, redirectToLogin, logout, updateMe };
}
