import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createSupabaseAdapter } from './adapter';

// Flag de migración (Nivel B): si VITE_USE_SUPABASE === 'true', el frontend usa el adapter de
// Supabase/Workers en lugar del SDK de Base44, SIN cambiar ninguna de las ~300 llamadas.
// Por defecto (flag ausente) sigue usando Base44 → comportamiento actual intacto.
const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';

function createBase44Client() {
  const { appId, token, functionsVersion } = appParams;
  return createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
  });
}

export const base44 = useSupabase ? createSupabaseAdapter() : createBase44Client();
