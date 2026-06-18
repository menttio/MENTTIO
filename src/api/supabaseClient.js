import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para el frontend. Usa la clave PUBLISHABLE (anon) — es pública por diseño;
// el acceso real lo controla RLS (políticas ligadas al usuario, Fase 4).
// Valores por defecto (públicos) para la rama nivel-b; se pueden sobreescribir con env vars.
const url = import.meta.env.VITE_SUPABASE_URL || "https://hvwwmjpjzmxzlncfxnph.supabase.co";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_SIH6V31I3wSyrkY47w17GA_SDCzkMGp";

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
