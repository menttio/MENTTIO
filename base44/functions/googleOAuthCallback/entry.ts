import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Parse state to get returnUrl
  let stateData = {};
  try {
    stateData = state ? JSON.parse(decodeURIComponent(state)) : {};
  } catch (e) {
    console.error('❌ Error parsing state:', e.message);
  }
  const { userEmail, userType, returnUrl = '/' } = stateData;

  // Base app URL for redirects
  const appBaseUrl = 'https://menttio.com';
  const errorRedirect = `${appBaseUrl}${returnUrl}?calendar_error=true`;
  const successRedirect = `${appBaseUrl}${returnUrl}?calendar_connected=true`;

  if (error) {
    console.error('❌ OAuth error from Google:', error);
    return Response.redirect(errorRedirect, 302);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return Response.redirect(errorRedirect, 302);
  }

  console.log('👤 userEmail:', userEmail, '| userType:', userType, '| returnUrl:', returnUrl);

  // Exchange code for tokens
  const tokenBody = new URLSearchParams({
    code,
    client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'),
    client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirect_uri: 'https://menttio.com/api/functions/googleOAuthCallback',
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('❌ Token exchange failed:', tokenResponse.status, errorText);
    return Response.redirect(errorRedirect, 302);
  }

  const tokens = await tokenResponse.json();
  console.log('✅ Tokens received. Has refresh_token:', !!tokens.refresh_token);

  const tokensWithExpiry = {
    ...tokens,
    expiry_date: Date.now() + (tokens.expires_in * 1000)
  };

  // Save tokens
  try {
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: userEmail });

    if (users.length > 0) {
      await base44.asServiceRole.entities[entity].update(users[0].id, {
        google_calendar_connected: true,
        google_calendar_tokens: tokensWithExpiry
      });
      console.log('✅ Entity updated successfully for:', userEmail);
    } else {
      console.error('❌ No user found with email:', userEmail);
      return Response.redirect(errorRedirect, 302);
    }
  } catch (err) {
    console.error('❌ Error saving tokens:', err.message);
    return Response.redirect(errorRedirect, 302);
  }

  return Response.redirect(successRedirect, 302);
});