import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function refreshAccessToken(tokens) {
  if (!tokens.refresh_token) return tokens.access_token;

  // Only refresh if expired (with 60s buffer)
  if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60000) {
    return tokens.access_token;
  }

  console.log('[deleteGoogleCalendarEvent] Refreshing expired access token...');
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
    console.error('[deleteGoogleCalendarEvent] Token refresh failed:', errText);
    return tokens.access_token; // Fall back to existing token
  }

  const newTokens = await refreshResponse.json();
  console.log('[deleteGoogleCalendarEvent] Token refreshed successfully');
  return newTokens.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { bookingId, userType, userEmail, eventId: directEventId } = await req.json();

    if (!userType || !userEmail) {
      return Response.json({ success: false, message: 'Missing userType or userEmail' }, { status: 400 });
    }

    console.log(`[deleteGoogleCalendarEvent] START userType=${userType} userEmail=${userEmail} eventId=${directEventId || 'from booking'}`);

    const targetEntity = userType === 'teacher' ? 'Teacher' : 'Student';

    // Use service role to read profile (bypasses RLS)
    const users = await base44.asServiceRole.entities[targetEntity].filter({ user_email: userEmail });

    if (users.length === 0 || !users[0].google_calendar_tokens) {
      return Response.json({ success: false, message: 'Google Calendar not connected' });
    }

    const profile = users[0];

    // Get access token — refresh in memory only, no DB write (avoids RLS on Teacher.update)
    const accessToken = await refreshAccessToken(profile.google_calendar_tokens);

    // Use directEventId if provided, otherwise look up from booking
    let eventId = directEventId;

    if (!eventId && bookingId) {
      const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!booking) {
        return Response.json({ success: false, message: 'Booking not found' });
      }
      eventId = booking[`google_event_id_${userType}`];
    }

    if (!eventId) {
      console.log(`[deleteGoogleCalendarEvent] No event ID found for ${userType} — skipping`);
      return Response.json({ success: false, message: 'No Google Calendar event ID found' });
    }

    console.log(`[deleteGoogleCalendarEvent] Deleting event ${eventId} for ${userType}: ${userEmail}`);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    // 404 means already deleted — treat as success
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      console.error(`[deleteGoogleCalendarEvent] Google Calendar API error (${response.status}):`, error);
      return Response.json({ success: false, error: `Google Calendar API error ${response.status}: ${error}` }, { status: 500 });
    }

    console.log(`[deleteGoogleCalendarEvent] Event deleted successfully: ${eventId}`);

    // Clear event ID from booking if we have bookingId — Booking has no RLS issues
    if (bookingId) {
      try {
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          [`google_event_id_${userType}`]: null
        });
      } catch (e) {
        // Booking may already be deleted — ignore
        console.warn('[deleteGoogleCalendarEvent] Could not clear event ID from booking:', e.message);
      }
    }

    return Response.json({ success: true, message: 'Event deleted from Google Calendar' });

  } catch (error) {
    console.error('[deleteGoogleCalendarEvent] Unexpected error:', error.message || error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});