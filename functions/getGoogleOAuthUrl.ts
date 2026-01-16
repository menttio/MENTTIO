import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userType } = await req.json();

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    
    if (!clientId) {
      return Response.json({ 
        error: 'Google OAuth no configurado' 
      }, { status: 500 });
    }

    // Use the app's published domain, not the function's domain
    const redirectUri = 'https://menttio.base44.app/api/functions/googleOAuthCallback';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly')}&` +
      `access_type=offline&` +
      `state=${encodeURIComponent(JSON.stringify({ userEmail: user.email, userType }))}`;

    return Response.json({ url: authUrl });

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});