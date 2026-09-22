import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Política de conservación: el RGPD no permite guardar datos personales «por si acaso».
// Esta función borra lo que ya no hace falta. Por defecto solo informa (dry run); para borrar
// de verdad hay que pedirlo explícitamente.
//
// Plazos (ver docs/politica-conservacion.md):
//  - RateLimit (huellas de IP del formulario): 7 días
//  - Notification (avisos de la campana): 180 días
//  - Message/Conversation sin actividad: 24 meses (solo si se pide con incluir_mensajes)
//  - Booking: NO se borra (obligaciones fiscales y contables)
//  - Consent: NO se borra (es la prueba de que hubo consentimiento)
const DIA = 24 * 60 * 60 * 1000;
const PLAZOS = { rate_limit_dias: 7, notificaciones_dias: 180, mensajes_meses: 24 };

function masViejoQue(record, ms) {
  const fecha = record?.created_date ? new Date(record.created_date).getTime() : 0;
  return fecha > 0 && Date.now() - fecha > ms;
}

async function purgar(coleccion, registros, aplicar, limite = 300) {
  let borrados = 0;
  for (const r of registros.slice(0, limite)) {
    if (!aplicar) {
      borrados++;
      continue;
    }
    try {
      await coleccion.delete(r.id);
      borrados++;
    } catch (e) {
      console.error('retention delete', e);
    }
  }
  return borrados;
}

Deno.serve(async (req) => {
  try {
    const automationSecret = Deno.env.get('AUTOMATION_SECRET');
    const providedKey = req.headers.get('x-automation-key') || '';
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const esAdmin = user?.role === 'admin';
    const esAutomatizacion = Boolean(automationSecret) && providedKey === automationSecret;
    if (!esAdmin && !esAutomatizacion) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const aplicar = body.aplicar === true;
    const incluirMensajes = body.incluir_mensajes === true;

    const db = base44.asServiceRole;
    const resumen = { aplicar, plazos: PLAZOS, borrados: {}, revisados: {} };

    // 1) Huellas de IP del formulario de contacto
    const limites = await db.entities.RateLimit.list('created_date', 500);
    const limitesViejos = limites.filter((r) => masViejoQue(r, PLAZOS.rate_limit_dias * DIA));
    resumen.revisados.rate_limit = limites.length;
    resumen.borrados.rate_limit = await purgar(db.entities.RateLimit, limitesViejos, aplicar);

    // 2) Notificaciones antiguas
    const notis = await db.entities.Notification.list('created_date', 500);
    const notisViejas = notis.filter((r) => masViejoQue(r, PLAZOS.notificaciones_dias * DIA));
    resumen.revisados.notificaciones = notis.length;
    resumen.borrados.notificaciones = await purgar(db.entities.Notification, notisViejas, aplicar);

    // 3) Conversaciones sin actividad (solo si se pide explícitamente)
    const conversaciones = await db.entities.Conversation.list('created_date', 500);
    const inactivas = conversaciones.filter((c) => {
      const ultima = c.last_message_date || c.created_date;
      const fecha = ultima ? new Date(ultima).getTime() : 0;
      return fecha > 0 && Date.now() - fecha > PLAZOS.mensajes_meses * 30 * DIA;
    });
    resumen.revisados.conversaciones_inactivas = inactivas.length;
    resumen.borrados.conversaciones = 0;
    resumen.borrados.mensajes = 0;
    if (incluirMensajes) {
      for (const conv of inactivas.slice(0, 50)) {
        const mensajes = await db.entities.Message.filter({ conversation_id: conv.id }, 'created_date', 500);
        resumen.borrados.mensajes += await purgar(db.entities.Message, mensajes, aplicar, 500);
        if (aplicar) {
          try {
            await db.entities.Conversation.delete(conv.id);
          } catch (e) {
            console.error('retention conversation', e);
          }
        }
        resumen.borrados.conversaciones++;
      }
    }

    return Response.json(resumen);
  } catch (error) {
    console.error('Error en dataRetention:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
