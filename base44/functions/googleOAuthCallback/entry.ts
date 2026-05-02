// Google OAuth Callback - exchanges code for tokens and passes them to frontend
// The frontend (already authenticated) saves the tokens to its own Teacher/Student record

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
    console.error('GOOGLE_OAUTH_CALLBACK: state parse error:', e.message);
    return redirectError('/', 'invalid_state', 'No se pudo decodificar el parámetro state');
  }

  const { userEmail, userType, returnUrl = '/' } = stateData;

  if (!userEmail || !userType) {
    console.error('GOOGLE_OAUTH_CALLBACK: missing userEmail or userType in state');
    return redirectError(returnUrl, 'invalid_state', 'Faltan datos de usuario en el state');
  }

  if (errorParam) {
    console.error('GOOGLE_OAUTH_CALLBACK: Google returned error:', errorParam);
    return redirectError(returnUrl, 'google_denied', errorParam);
  }

  if (!code) {
    console.error('GOOGLE_OAUTH_CALLBACK: no authorization code');
    return redirectError(returnUrl, 'no_code', 'Google no devolvió código de autorización');
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
      let detail = 'HTTP ' + tokenResponse.status;
      try {
        const parsed = JSON.parse(responseText);
        detail = parsed.error_description || parsed.error || detail;
      } catch {}
      console.error('GOOGLE_OAUTH_CALLBACK: token exchange FAILED:', detail);
      return redirectError(returnUrl, 'token_exchange_failed', detail);
    }

    tokens = JSON.parse(responseText);
    console.log('GOOGLE_OAUTH_CALLBACK: token exchange SUCCESS. has_access_token:', !!tokens.access_token, '| has_refresh_token:', !!tokens.refresh_token);
  } catch (err) {
    console.error('GOOGLE_OAUTH_CALLBACK: token exchange exception:', err.message);
    return redirectError(returnUrl, 'token_exchange_failed', err.message);
  }

  // Pass tokens to frontend so it can save them using its own authenticated session
  // This avoids service role issues — the frontend user has write permission to their own Teacher/Student
  const tokensWithExpiry = {
    ...tokens,
    expiry_date: Date.now() + (tokens.expires_in * 1000)
  };

  const tokensEncoded = encodeURIComponent(JSON.stringify(tokensWithExpiry));
  const userTypeEncoded = encodeURIComponent(userType);

  const appBase = 'https://menttio.com';
  const dest = `${appBase}${returnUrl}?calendar_pending=true&cal_tokens=${tokensEncoded}&cal_user_type=${userTypeEncoded}`;

  console.log('GOOGLE_OAUTH_CALLBACK: ===== SUCCESS, redirecting to frontend for token save =====');
  return Response.redirect(dest, 302);
});

function redirectError(returnUrl, errorCode, detail = '') {
  const appBase = 'https://menttio.com';
  const detailEncoded = encodeURIComponent(detail.substring(0, 200));
  const dest = `${appBase}${returnUrl}?calendar_error=${errorCode}&detail=${detailEncoded}`;
  console.log('GOOGLE_OAUTH_CALLBACK: redirecting with error:', errorCode, '| detail:', detail);
  return Response.redirect(dest, 302);
}