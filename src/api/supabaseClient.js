import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para el frontend. Usa la clave PUBLISHABLE (anon) — es pública por diseño;
// el acceso real lo controla RLS (políticas ligadas al usuario, Fase 4).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
