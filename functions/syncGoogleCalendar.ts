import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { bookingId, userType, userEmail } = await req.json();

    // Get booking details
    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Determine which user to sync for
    let targetUserEmail, targetUserType, targetEntity;
    
    if (userType && userEmail) {
      // Sync for specific user
      targetUserEmail = userEmail;
      targetUserType = userType;
      targetEntity = userType === 'teacher' ? 'Teacher' : 'Student';
    } else {
      // Legacy: sync for current authenticated user
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const isTeacher = user.email === booking.teacher_email;
      targetUserEmail = user.email;
      targetUserType = isTeacher ? 'teacher' : 'student';
      targetEntity = isTeacher ? 'Teacher' : 'Student';
    }

    // Get user's Google Calendar tokens
    const users = await base44.asServiceRole.entities[targetEntity].filter({ user_email: targetUserEmail });
    
    if (users.length === 0 || !users[0].google_calendar_tokens) {
      return Response.json({ 
        success: false,
        message: 'Google Calendar not connected for this user' 
      });
    }

    let tokens = users[0].google_calendar_tokens;
    let accessToken = tokens.access_token;

    // Check if token needs refresh
    if (tokens.refresh_token && (!tokens.expiry_date || Date.now() >= tokens.expiry_date)) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID'),
          client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET'),
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;
        
        tokens = {
          ...tokens,
          access_token: newTokens.access_token,
          expiry_date: Date.now() + (newTokens.expires_in * 1000)
        };
        
        await base44.asServiceRole.entities[targetEntity].update(users[0].id, {
          google_calendar_tokens: tokens
        });
      }
    }

    // Create or update event in Google Calendar
    const startDateTime = `${booking.date}T${booking.start_time}:00`;
    const endDateTime = `${booking.date}T${booking.end_time}:00`;

    const eventTitle = targetUserType === 'teacher' 
      ? `Clase de ${booking.subject_name} con ${booking.student_name}`
      : `Clase de ${booking.subject_name} con ${booking.teacher_name}`;

    const eventDescription = targetUserType === 'teacher' 
      ? `Clase con ${booking.student_name}`
      : `Clase con ${booking.teacher_name}`;

    const event = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Madrid'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 1440 }
        ]
      }
    };

    // Check if event already exists
    const existingEventId = booking[`google_event_id_${targetUserType}`];
    
    let response;
    if (existingEventId) {
      // Update existing event
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );
    } else {
      // Create new event
      response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`Google Calendar API error for ${targetUserType}:`, error);
      return Response.json({ 
        success: false,
        error: `Google Calendar API error: ${error}` 
      }, { status: 500 });
    }

    const createdEvent = await response.json();

    // Store event ID in booking
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      [`google_event_id_${targetUserType}`]: createdEvent.id
    });

    return Response.json({ 
      success: true, 
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink
    });

  } catch (error) {
    console.error('Error syncing with Google Calendar:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});