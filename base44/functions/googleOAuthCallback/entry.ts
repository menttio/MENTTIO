import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('🔵 googleOAuthCallback START');
    console.log('📦 code:', code ? 'PRESENT' : 'MISSING');
    console.log('📦 state:', state);
    console.log('📦 error param:', error);

    if (error) {
      console.error('❌ OAuth error from Google:', error);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'oauth_error', error: '${error}' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return Response.json({ error: 'No authorization code' }, { status: 400 });
    }

    // Parse state
    let stateData = {};
    try {
      stateData = state ? JSON.parse(decodeURIComponent(state)) : {};
    } catch (e) {
      console.error('❌ Error parsing state:', e.message, '| Raw state:', state);
    }
    const { userEmail, userType } = stateData;
    console.log('👤 userEmail:', userEmail, '| userType:', userType);

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    const tokenBody = new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      redirect_uri: 'https://menttio.com/api/functions/googleOAuthCallback',
      grant_type: 'authorization_code',
    });
    console.log('📤 redirect_uri:', 'https://menttio.com/api/functions/googleOAuthCallback');
    console.log('📤 client_id present:', !!Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'));
    console.log('📤 client_secret present:', !!Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'));

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });

    console.log('📥 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed. Status:', tokenResponse.status, '| Body:', errorText);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'oauth_error', error: 'Token exchange failed' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received. Has refresh_token:', !!tokens.refresh_token, '| Has access_token:', !!tokens.access_token);

    const tokensWithExpiry = {
      ...tokens,
      expiry_date: Date.now() + (tokens.expires_in * 1000)
    };

    // Save tokens and update connection status
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    console.log('💾 Saving to entity:', entity, '| for email:', userEmail);

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: userEmail });
    console.log('🔍 Users found:', users.length);

    if (users.length > 0) {
      console.log('✏️ Updating entity id:', users[0].id);
      await base44.asServiceRole.entities[entity].update(users[0].id, {
        google_calendar_connected: true,
        google_calendar_tokens: tokensWithExpiry
      });
      console.log('✅ Entity updated successfully');
    } else {
      console.error('❌ No user found with email:', userEmail, 'in entity:', entity);
    }

    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'oauth_success' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error.message);
    console.error('❌ Stack:', error.stack);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'oauth_error', error: '${error.message}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});