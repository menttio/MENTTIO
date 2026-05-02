import { createClient } from 'npm:@base44/sdk@0.8.25';

const REDIRECT_URI = 'https://menttio.com/api/functions/googleOAuthCallback';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  console.log('GOOGLE_OAUTH_CALLBACK: ===== START =====');
  console.log('GOOGLE_OAUTH_CALLBACK: code received:', code ? 'YES (length=' + code.length + ')' : 'MISSING');
  console.log('GOOGLE_OAUTH_CALLBACK: state received:', state ? 'YES' : 'MISSING');
  console.log('GOOGLE_OAUTH_CALLBACK: error param:', errorParam || 'none');

  // Parse state
  let stateData = {};
  try {
    stateData = state ? JSON.parse(decodeURIComponent(state)) : {};
    console.log('GOOGLE_OAUTH_CALLBACK: state decoded OK:', JSON.stringify(stateData));
  } catch (e) {
    console.error('GOOGLE_OAUTH_CALLBACK: state parse error:', e.message, '| raw state:', state);
    return redirect(stateData, 'invalid_state', 'No se pudo decodificar el parámetro state');
  }

  const { userEmail, userType, returnUrl = '/' } = stateData;

  if (!userEmail || !userType) {
    console.error('GOOGLE_OAUTH_CALLBACK: missing userEmail or userType in state');
    return redirect(stateData, 'invalid_state', 'Faltan datos de usuario en el state');
  }

  if (errorParam) {
    console.error('GOOGLE_OAUTH_CALLBACK: Google returned error:', errorParam);
    return redirect(stateData, 'google_denied', errorParam);
  }

  if (!code) {
    console.error('GOOGLE_OAUTH_CALLBACK: no authorization code');
    return redirect(stateData, 'no_code', 'Google no devolvió código de autorización');
  }

  // Exchange code for tokens
  console.log('GOOGLE_OAUTH_CALLBACK: exchanging code for tokens...');
  console.log('GOOGLE_OAUTH_CALLBACK: redirect_uri used:', REDIRECT_URI);
  console.log('GOOGLE_OAUTH_CALLBACK: client_id present:', !!Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'));
  console.log('GOOGLE_OAUTH_CALLBACK: client_secret present:', !!Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'));

  let tokens;
  try {
    const tokenBody = new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });

    const responseText = await tokenResponse.text();
    console.log('GOOGLE_OAUTH_CALLBACK: token exchange status:', tokenResponse.status);
    console.log('GOOGLE_OAUTH_CALLBACK: token exchange response:', responseText.substring(0, 500));

    if (!tokenResponse.ok) {
      console.error('GOOGLE_OAUTH_CALLBACK: token exchange FAILED. Status:', tokenResponse.status, '| Body:', responseText);
      let detail = 'HTTP ' + tokenResponse.status;
      try {
        const parsed = JSON.parse(responseText);
        detail = parsed.error_description || parsed.error || detail;
      } catch {}
      return redirect(stateData, 'token_exchange_failed', detail);
    }

    tokens = JSON.parse(responseText);
    console.log('GOOGLE_OAUTH_CALLBACK: token exchange SUCCESS. has_access_token:', !!tokens.access_token, '| has_refresh_token:', !!tokens.refresh_token);
  } catch (err) {
    console.error('GOOGLE_OAUTH_CALLBACK: token exchange exception:', err.message);
    return redirect(stateData, 'token_exchange_failed', err.message);
  }

  const tokensWithExpiry = {
    ...tokens,
    expiry_date: Date.now() + (tokens.expires_in * 1000)
  };

  // Save tokens to DB using service role (no user session available in OAuth callback)
  console.log('GOOGLE_OAUTH_CALLBACK: saving tokens for', userType, userEmail);
  try {
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: userEmail });
    console.log('GOOGLE_OAUTH_CALLBACK: found', users.length, entity, 'record(s) for email:', userEmail);

    if (users.length === 0) {
      console.error('GOOGLE_OAUTH_CALLBACK: no', entity, 'found with email:', userEmail);
      return redirect(stateData, 'user_not_found', 'No se encontró el perfil para ' + userEmail);
    }

    console.log('GOOGLE_OAUTH_CALLBACK: attempting update with service role...');
    await base44.asServiceRole.entities[entity].update(users[0].id, {
      google_calendar_connected: true,
      google_calendar_tokens: tokensWithExpiry
    });
    console.log('GOOGLE_OAUTH_CALLBACK: DB update SUCCESS for id:', users[0].id);
  } catch (err) {
    console.error('GOOGLE_OAUTH_CALLBACK: DB update FAILED:', err.message);
    return redirect(stateData, 'update_failed', err.message);
  }

  console.log('GOOGLE_OAUTH_CALLBACK: ===== SUCCESS, redirecting to:', returnUrl, '=====');
  const appBase = 'https://menttio.com';
  return Response.redirect(`${appBase}${returnUrl}?calendar_connected=true`, 302);
});

function redirect(stateData, errorCode, detail = '') {
  const returnUrl = stateData?.returnUrl || '/';
  const appBase = 'https://menttio.com';
  const detailEncoded = encodeURIComponent(detail.substring(0, 200));
  const dest = `${appBase}${returnUrl}?calendar_error=${errorCode}&detail=${detailEncoded}`;
  console.log('GOOGLE_OAUTH_CALLBACK: redirecting with error:', errorCode, '| detail:', detail);
  return Response.redirect(dest, 302);
}