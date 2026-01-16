import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userType } = await req.json();

    // Use Base44 app connector to get OAuth URL
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    // Mark as connected since we're using the app connector
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const users = await base44.entities[entity].filter({ user_email: user.email });

    if (users.length > 0) {
      await base44.entities[entity].update(users[0].id, {
        google_calendar_connected: true
      });
    }

    return Response.json({ connected: true });

  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});