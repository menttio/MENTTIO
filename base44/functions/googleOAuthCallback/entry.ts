import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Google OAuth Callback.
// SEGURIDAD (09/11/2026): antes devolvia los tokens de Google (incluido el refresh_token) en la
// URL de vuelta para que los guardara el navegador, confiaba en un `state` sin firmar y
// registraba la respuesta de Google en los logs. Ahora:
//  - solo acepta un state firmado por getGoogleOAuthUrl y no caducado (15 min);
//  - guarda los tokens en el servidor, en la ficha del usuario que inicio la conexion;
//  - vuelve a una ruta interna de menttio.com con ?calendar_connected=true, sin tokens;
//  - no escribe tokens en los logs.

const REDIRECT_URI = 'https://menttio.com/api/functions/googleOAuthCallback';
const APP = 'https://menttio.com';
const enc = new TextEncoder();

function desdeB64url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b + '='.repeat((4 - (b.length % 4)) % 4));
}

function rutaInterna(r: unknown): string {
  const s = typeof r === 'string' ? r.trim() : '';
  if (!s.startsWith('/') || s.startsWith('//') || /[@\\\s]/.test(s) || s.length > 200) return '/';
  return s.split('?')[0].split('#')[0] || '/';
}

async function stateValido(state: string | null): Promise<{ e: string; t: string; r: string } | null> {
  if (!state || !state.includes('.')) return null;
  const [payload, firma] = state.split('.');
  try {
    const clave = await crypto.subtle.importKey(
      'raw', enc.encode('oauth-state:' + (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '')),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const firmaBytes = Uint8Array.from(desdeB64url(firma), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify('HMAC', clave, firmaBytes, enc.encode(payload));
    if (!ok) return null;
    const d = JSON.parse(desdeB64url(payload));
    if (!d?.e || !d?.t || typeof d.x !== 'number' || Date.now() > d.x) return null;
    return { e: String(d.e).toLowerCase(), t: d.t === 'teacher' ? 'teacher' : 'student', r: rutaInterna(d.r) };
  } catch {
    return null;
  }
}

function volver(ruta: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return Response.redirect(`${APP}${rutaInterna(ruta)}?${qs}`, 302);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  const datos = await stateValido(url.searchParams.get('state'));
  if (!datos) {
    console.warn('GOOGLE_OAUTH_CALLBACK: state invalido o caducado');
    return volver('/', { calendar_error: 'invalid_state' });
  }
  if (errorParam) {
    return volver(datos.r, { calendar_error: 'google_denied' });
  }
  if (!code) {
    return volver(datos.r, { calendar_error: 'no_code' });
  }

  let tokens: any;
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
        client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      console.error('GOOGLE_OAUTH_CALLBACK: intercambio fallido, HTTP', tokenResponse.status);
      return volver(datos.r, { calendar_error: 'token_exchange_failed' });
    }
    tokens = await tokenResponse.json();
  } catch {
    console.error('GOOGLE_OAUTH_CALLBACK: excepcion en el intercambio');
    return volver(datos.r, { calendar_error: 'token_exchange_failed' });
  }

  try {
    const base44 = createClientFromRequest(req);
    const entidad = datos.t === 'teacher' ? 'Teacher' : 'Student';
    const fichas = await base44.asServiceRole.entities[entidad].filter({ user_email: datos.e });
    if (!fichas.length) {
      return volver(datos.r, { calendar_error: 'user_not_found' });
    }
    const anteriores = fichas[0].google_calendar_tokens || {};
    await base44.asServiceRole.entities[entidad].update(fichas[0].id, {
      google_calendar_connected: true,
      google_calendar_tokens: {
        access_token: tokens.access_token,
        // Google solo manda refresh_token cuando se da el consentimiento; si no viene, se conserva.
        refresh_token: tokens.refresh_token || anteriores.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      },
    });
  } catch {
    console.error('GOOGLE_OAUTH_CALLBACK: no se pudo guardar la conexion');
    return volver(datos.r, { calendar_error: 'update_failed' });
  }

  return volver(datos.r, { calendar_connected: 'true' });
});
