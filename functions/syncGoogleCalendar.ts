import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await req.json();

    // Get booking details
    const booking = await base44.entities.Booking.get(bookingId);
    
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Determine if current user is teacher or student
    const isTeacher = user.email === booking.teacher_email;
    const entity = isTeacher ? 'Teacher' : 'Student';
    const userEmail = user.email;

    // Get user's Google Calendar tokens
    const users = await base44.asServiceRole.entities[entity].filter({ user_email: userEmail });
    
    if (users.length === 0 || !users[0].google_calendar_tokens) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const accessToken = users[0].google_calendar_tokens.access_token;

    // Create event in Google Calendar
    const startDateTime = `${booking.date}T${booking.start_time}:00`;
    const endDateTime = `${booking.date}T${booking.end_time}:00`;

    const event = {
      summary: `Clase de ${booking.subject_name}`,
      description: `Clase con ${user.email === booking.teacher_email ? booking.student_name : booking.teacher_name}`,
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

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const createdEvent = await response.json();

    return Response.json({ 
      success: true, 
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink
    });

  } catch (error) {
    console.error('Error syncing with Google Calendar:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});