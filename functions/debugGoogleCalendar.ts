import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userType } = await req.json();

    // Get user entity
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: user.email });

    if (users.length === 0) {
      return Response.json({ 
        error: 'User not found',
        userEmail: user.email,
        entity
      });
    }

    const userData = users[0];

    // Check connection status
    const debugInfo = {
      user_email: user.email,
      entity_type: entity,
      google_calendar_connected: userData.google_calendar_connected,
      has_tokens: !!userData.google_calendar_tokens,
      tokens_info: userData.google_calendar_tokens ? {
        has_access_token: !!userData.google_calendar_tokens.access_token,
        has_refresh_token: !!userData.google_calendar_tokens.refresh_token,
        access_token_preview: userData.google_calendar_tokens.access_token ? 
          userData.google_calendar_tokens.access_token.substring(0, 20) + '...' : null,
        expiry_date: userData.google_calendar_tokens.expiry_date,
        is_expired: userData.google_calendar_tokens.expiry_date ? 
          Date.now() >= userData.google_calendar_tokens.expiry_date : null
      } : null
    };

    // Try to fetch events if tokens exist
    if (userData.google_calendar_tokens?.access_token) {
      try {
        const now = new Date();
        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
        url.searchParams.append('timeMin', now.toISOString());
        url.searchParams.append('maxResults', '10');
        url.searchParams.append('singleEvents', 'true');
        url.searchParams.append('orderBy', 'startTime');

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${userData.google_calendar_tokens.access_token}`
          }
        });

        debugInfo.api_test = {
          status: response.status,
          ok: response.ok
        };

        if (response.ok) {
          const data = await response.json();
          debugInfo.api_test.events_count = data.items?.length || 0;
          debugInfo.api_test.sample_events = data.items?.slice(0, 3).map(e => ({
            summary: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date
          }));
        } else {
          const errorText = await response.text();
          debugInfo.api_test.error = errorText;
        }
      } catch (apiError) {
        debugInfo.api_test = {
          error: apiError.message
        };
      }
    }

    return Response.json(debugInfo);

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});