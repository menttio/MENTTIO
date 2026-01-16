import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, userType } = await req.json();

    // Get user's Google Calendar tokens
    const entity = userType === 'teacher' ? 'Teacher' : 'Student';
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: user.email });
    
    if (users.length === 0 || !users[0].google_calendar_tokens) {
      return Response.json({ events: [] });
    }

    const accessToken = users[0].google_calendar_tokens.access_token;

    // Fetch events from Google Calendar
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', `${startDate}T00:00:00Z`);
    url.searchParams.append('timeMax', `${endDate}T23:59:59Z`);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const data = await response.json();

    // Transform events to our format
    const events = data.items.map(event => {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;
      
      return {
        id: event.id,
        summary: event.summary,
        start: start,
        end: end,
        date: start.split('T')[0],
        startTime: start.split('T')[1]?.substring(0, 5),
        endTime: end.split('T')[1]?.substring(0, 5)
      };
    });

    return Response.json({ events });

  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});