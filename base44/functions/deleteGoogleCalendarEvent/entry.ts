import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getAccessToken(tokens, targetEntity, userId, base44) {
  let accessToken = tokens.access_token;

  // Refresh token if expired
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
      const updatedTokens = {
        ...tokens,
        access_token: newTokens.access_token,
        expiry_date: Date.now() + (newTokens.expires_in * 1000)
      };
      await base44.asServiceRole.entities[targetEntity].update(userId, {
        google_calendar_tokens: updatedTokens
      });
    }
  }

  return accessToken;
}

async function deleteEvent(accessToken, eventId) {
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
    throw new Error(`Google Calendar API error: ${error}`);
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { bookingId, userType, userEmail, eventId: directEventId } = await req.json();

    const targetEntity = userType === 'teacher' ? 'Teacher' : 'Student';

    // Get user's Google Calendar tokens
    const users = await base44.asServiceRole.entities[targetEntity].filter({ user_email: userEmail });

    if (users.length === 0 || !users[0].google_calendar_tokens) {
      return Response.json({ success: false, message: 'Google Calendar not connected' });
    }

    const user = users[0];
    const accessToken = await getAccessToken(user.google_calendar_tokens, targetEntity, user.id, base44);

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
      return Response.json({ success: false, message: 'No Google Calendar event ID found' });
    }

    await deleteEvent(accessToken, eventId);

    // Clear event ID from booking if we have bookingId
    if (bookingId) {
      try {
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          [`google_event_id_${userType}`]: null
        });
      } catch (e) {
        // Booking may already be deleted — ignore
      }
    }

    return Response.json({ success: true, message: 'Event deleted from Google Calendar' });

  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});