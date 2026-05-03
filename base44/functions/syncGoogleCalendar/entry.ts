import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function refreshAccessToken(tokens) {
  if (!tokens.refresh_token) return tokens.access_token;
  
  // Only refresh if expired (with 60s buffer)
  if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60000) {
    return tokens.access_token;
  }

  console.log('[syncGoogleCalendar] Refreshing expired access token...');
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  if (!refreshResponse.ok) {
    const errText = await refreshResponse.text();
    console.error('[syncGoogleCalendar] Token refresh failed:', errText);
    // Fall back to existing token — Google will reject if truly invalid
    return tokens.access_token;
  }

  const newTokens = await refreshResponse.json();
  console.log('[syncGoogleCalendar] Token refreshed successfully');
  return newTokens.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, userType, userEmail, date, start_time, end_time } = await req.json();

    if (!bookingId || !userType || !userEmail) {
      return Response.json({ error: 'Missing required params: bookingId, userType, userEmail' }, { status: 400 });
    }

    console.log(`[syncGoogleCalendar] START bookingId=${bookingId} userType=${userType} userEmail=${userEmail}`);

    // Always use service role to read Booking (avoid RLS issues)
    const bookingFromDB = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!bookingFromDB) {
      console.error('[syncGoogleCalendar] Booking not found:', bookingId);
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Allow caller to override date/time (avoids race condition when booking was just updated)
    const booking = {
      ...bookingFromDB,
      ...(date && { date }),
      ...(start_time && { start_time }),
      ...(end_time && { end_time }),
    };

    const targetEntity = userType === 'teacher' ? 'Teacher' : 'Student';

    // Use service role to read the profile — this bypasses RLS on Teacher
    const profiles = await base44.asServiceRole.entities[targetEntity].filter({ user_email: userEmail });

    if (profiles.length === 0) {
      console.warn(`[syncGoogleCalendar] ${targetEntity} not found for email: ${userEmail}`);
      return Response.json({ success: false, message: `${targetEntity} profile not found` });
    }

    const profile = profiles[0];

    if (!profile.google_calendar_connected || !profile.google_calendar_tokens) {
      console.log(`[syncGoogleCalendar] Google Calendar not connected for ${userType}: ${userEmail}`);
      return Response.json({ success: false, message: 'Google Calendar not connected for this user' });
    }

    // Get a valid access token — refresh if needed (we don't persist the refresh to avoid RLS on Teacher.update)
    const accessToken = await refreshAccessToken(profile.google_calendar_tokens);

    // Build calendar event
    const startDateTime = `${booking.date}T${booking.start_time}:00`;
    const endDateTime = `${booking.date}T${booking.end_time}:00`;
    const isGroup = booking.class_type === 'group';

    const eventTitle = isGroup
      ? `Clase grupal de ${booking.subject_name}`
      : userType === 'teacher'
        ? `Clase de ${booking.subject_name} con ${booking.student_name}`
        : `Clase de ${booking.subject_name} con ${booking.teacher_name}`;

    let eventDescription = isGroup
      ? `Clase grupal de ${booking.subject_name} (${booking.enrolled_students?.length || 1} alumno(s))\n\nID reserva: ${booking.id}`
      : userType === 'teacher'
        ? `Clase con ${booking.student_name}\n\nID reserva: ${booking.id}`
        : `Clase con ${booking.teacher_name}\n\nID reserva: ${booking.id}`;

    if (booking.meet_link) {
      eventDescription += `\n\nGoogle Meet: ${booking.meet_link}`;
    }

    const event = {
      summary: eventTitle,
      description: eventDescription,
      start: { dateTime: startDateTime, timeZone: 'Europe/Madrid' },
      end: { dateTime: endDateTime, timeZone: 'Europe/Madrid' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 1440 }
        ]
      }
    };

    const existingEventId = booking[`google_event_id_${userType}`];
    let calResponse;

    if (existingEventId) {
      console.log(`[syncGoogleCalendar] Updating existing event ${existingEventId} for ${userType}`);
      calResponse = await fetch(
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
      console.log(`[syncGoogleCalendar] Creating new event for ${userType}: ${userEmail}`);
      calResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    }

    if (!calResponse.ok) {
      const errText = await calResponse.text();
      console.error(`[syncGoogleCalendar] Google Calendar API error (${calResponse.status}) for ${userType} ${userEmail}:`, errText);
      return Response.json({
        success: false,
        error: `Google Calendar API error ${calResponse.status}: ${errText}`
      }, { status: 500 });
    }

    const createdEvent = await calResponse.json();
    console.log(`[syncGoogleCalendar] Event ${existingEventId ? 'updated' : 'created'}: ${createdEvent.id} for ${userType}`);

    // Save event ID back to booking — service role so it always works
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      [`google_event_id_${userType}`]: createdEvent.id
    });

    console.log(`[syncGoogleCalendar] SUCCESS bookingId=${bookingId} eventId=${createdEvent.id}`);

    return Response.json({
      success: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink
    });

  } catch (error) {
    console.error('[syncGoogleCalendar] Unexpected error:', error.message || error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});