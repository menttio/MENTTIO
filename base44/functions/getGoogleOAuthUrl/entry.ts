import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// SEGURIDAD (09/11/2026): el `state` iba en claro y sin firmar, con un returnUrl que nadie
// validaba. Con un state fabricado (`returnUrl: "@evil.com/"`), el callback redirigia a
// https://menttio.com@evil.com/?cal_tokens=... y los tokens de Google de la victima (incluido el
// refresh_token) acababan en otro dominio. Ahora:
//  - el returnUrl solo puede ser una ruta interna ("/Algo"), nunca "//", "@" ni "\";
//  - el state lleva el correo de la sesion, caduca a los 15 minutos y va firmado (HMAC-SHA256)
//    con un secreto que solo conoce el servidor; el callback rechaza cualquier otro.
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function rutaInterna(r: unknown): string {
  const s = typeof r === 'string' ? r.trim() : '';
  if (!s.startsWith('/') || s.startsWith('//') || /[@\\\s]/.test(s) || s.length > 200) return '/';
  return s.split('?')[0].split('#')[0] || '/';
}

async function firmar(datos: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw', enc.encode('oauth-state:' + (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', clave, enc.encode(datos)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userType, returnUrl } = await req.json().catch(() => ({}));

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientId || !Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')) {
      return Response.json({ error: 'Google OAuth no configurado' }, { status: 500 });
    }

    const redirectUri = 'https://menttio.com/api/functions/googleOAuthCallback';

    const payload = b64url(enc.encode(JSON.stringify({
      e: String(user.email).toLowerCase(),
      t: userType === 'teacher' ? 'teacher' : 'student',
      r: rutaInterna(returnUrl),
      n: b64url(crypto.getRandomValues(new Uint8Array(12))),
      x: Date.now() + 15 * 60 * 1000,
    })));
    const state = `${payload}.${await firmar(payload)}`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly')}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    return Response.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
