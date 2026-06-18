import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createSupabaseAdapter } from './adapter';

// Flag de migración (Nivel B). En la rama nivel-b el DEFECTO es usar el adapter de Supabase/Workers
// (esta rama es la migración). Para forzar Base44 en un build concreto: VITE_USE_SUPABASE='false'.
// OJO: al fusionar a main en el corte, esto deja la app en modo Supabase (intencionado).
const useSupabase = import.meta.env.VITE_USE_SUPABASE !== 'false';

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
