import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
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
      return Response.json({ error: 'No authorization code' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stateData = state ? JSON.parse(decodeURIComponent(state)) : {};
    const { userType } = stateData;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'),
        redirect_uri: `${url.origin}/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      return Response.json({ error: 'Failed to exchange code' }, { status: 500 });
    }

    const tokens = await tokenResponse.json();

    // Save tokens and update connection status
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const users = await base44.entities[entity].filter({ user_email: user.email });

    if (users.length > 0) {
      await base44.entities[entity].update(users[0].id, {
        google_calendar_connected: true,
        google_calendar_tokens: tokens
      });
    }

    // Close the popup and notify parent window
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
    console.error('OAuth callback error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});