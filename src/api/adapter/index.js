// Adapter con la MISMA forma que el cliente de Base44 (entities/auth/functions/integrations)
// pero respaldado por Supabase + Cloudflare Workers. Permite cambiar el origen de datos
// conmutando un flag, sin tocar las ~300 llamadas del frontend.
import { supabase } from "../supabaseClient";
import { makeEntities } from "./entities";
import { makeAuth } from "./auth";
import { makeFunctions } from "./functions";
import { makeIntegrations } from "./integrations";

export function createSupabaseAdapter(client = supabase) {
  if (!client) {
    throw new Error(
      "Supabase no configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY",
    );
  }
  return {
    entities: makeEntities(client),
    auth: makeAuth(client),
    functions: makeFunctions(client),
    integrations: makeIntegrations(client),
  };
}
