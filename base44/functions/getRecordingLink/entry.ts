import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'booking_id es requerido' }, { status: 400 });
    }

    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    const SPREADSHEET_ID = '1nMW1_WhHSPm-GylDv8TCgdbeXgNAOXg9EnLMxHPpJ-8';

    // Obtener todas las filas de la hoja (primera columna y sexta columna)
    const range = 'A:F'; // Columnas A a F
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Google Sheets API:', errorData);
      return Response.json({ error: 'Error al acceder a Google Sheets', details: errorData }, { status: 500 });
    }

    const data = await response.json();
    const rows = data.values || [];

    // Buscar el booking_id en la primera columna (índice 0)
    let driveFileId = null;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[0].toString() === booking_id.toString()) {
        // Encontrado! Extraer la sexta columna (índice 5)
        driveFileId = row[5] || null;
        break;
      }
    }

    if (!driveFileId) {
      return Response.json({ recording_url: null });
    }

    // Limpiar y formatear el link
    let recordingUrl = driveFileId.trim();
    
    // Si ya es una URL de Drive, usarla tal cual
    if (recordingUrl.includes('drive.google.com')) {
      // Extraer solo el ID si está en formato URL
      const match = recordingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        recordingUrl = `https://drive.google.com/file/d/${match[1]}/view`;
      }
    } else {
      // Si es solo el ID, construir la URL
      recordingUrl = `https://drive.google.com/file/d/${recordingUrl}/view`;
    }

    return Response.json({ recording_url: recordingUrl });

  } catch (error) {
    console.error('Error en getRecordingLink:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});