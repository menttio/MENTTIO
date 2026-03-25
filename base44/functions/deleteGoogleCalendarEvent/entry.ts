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

    // Determine which user to delete for
    const targetUserEmail = userEmail;
    const targetUserType = userType;
    const targetEntity = userType === 'teacher' ? 'Teacher' : 'Student';

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

    // Get event ID from booking
    const eventId = booking[`google_event_id_${targetUserType}`];
    
    if (!eventId) {
      return Response.json({ 
        success: false,
        message: 'No Google Calendar event found for this booking' 
      });
    }

    // Delete event from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      console.error(`Google Calendar API error for ${targetUserType}:`, error);
      return Response.json({ 
        success: false,
        error: `Google Calendar API error: ${error}` 
      }, { status: 500 });
    }

    // Clear event ID from booking
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      [`google_event_id_${targetUserType}`]: null
    });

    return Response.json({ 
      success: true,
      message: 'Event deleted from Google Calendar'
    });

  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});