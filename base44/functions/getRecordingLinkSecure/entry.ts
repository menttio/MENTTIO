import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sustituye a getRecordingLink, que devolvía la grabación de cualquier clase con solo
// cambiar el booking_id. Ahora se comprueba que quien pregunta participó en esa clase.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id: bookingId } = await req.json().catch(() => ({}));
    if (!bookingId) {
      return Response.json({ error: 'booking_id es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const booking = await db.entities.Booking.get(String(bookingId)).catch(() => null);
    if (!booking) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const email = (user.email || '').toLowerCase();
    const enrolled = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    const allowed =
      user.role === 'admin' ||
      (booking.student_email || '').toLowerCase() === email ||
      (booking.teacher_email || '').toLowerCase() === email ||
      enrolled.some((s) => (s.student_email || '').toLowerCase() === email);

    if (!allowed) {
      return Response.json({ error: 'No tienes acceso a esta grabación' }, { status: 403 });
    }

    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    const spreadsheetId = Deno.env.get('RECORDINGS_SPREADSHEET_ID') || '1nMW1_WhHSPm-GylDv8TCgdbeXgNAOXg9EnLMxHPpJ-8';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error de Google Sheets API:', response.status, (await response.text()).slice(0, 300));
      return Response.json({ error: 'No se ha podido consultar la grabación' }, { status: 502 });
    }

    const data = await response.json();
    const rows = data.values || [];
    let driveFileId = null;
    for (const row of rows) {
      if (row[0] && row[0].toString() === bookingId.toString()) {
        driveFileId = row[5] || null;
        break;
      }
    }

    if (!driveFileId) {
      return Response.json({ recording_url: null });
    }

    let recordingUrl = String(driveFileId).trim();
    if (recordingUrl.includes('drive.google.com')) {
      const match = recordingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) recordingUrl = `https://drive.google.com/file/d/${match[1]}/view`;
    } else {
      recordingUrl = `https://drive.google.com/file/d/${recordingUrl}/view`;
    }

    return Response.json({ recording_url: recordingUrl });
  } catch (error) {
    console.error('Error en getRecordingLinkSecure:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
