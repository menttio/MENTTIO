import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sustituye a sendContactEmail, que no limitaba envíos ni escapaba el HTML: se podía usar
// para inundar el buzón de Menttio y para meter etiquetas HTML en los correos.
const MENSAJES_POR_IP_POR_HORA = 3;
const HOUR_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BUZON = 'menttio@menttio.com';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

function clientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || '';
}

async function hashIp(ip) {
  const data = new TextEncoder().encode('menttio:' + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // Campo trampa: los formularios automáticos lo rellenan, las personas no lo ven.
    if (clip(body.website, 50)) {
      return Response.json({ success: true });
    }

    const name = clip(body.name, 80);
    const lastName = clip(body.lastName, 80);
    const email = clip(body.email, 254).toLowerCase();
    const message = clip(body.message, 3000);

    if (!name || !lastName || !message) {
      return Response.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: 'Escribe un correo electrónico válido' }, { status: 400 });
    }

    const db = createClientFromRequest(req).asServiceRole;

    const ip = clientIp(req);
    if (ip) {
      const ipHash = await hashIp(ip);
      const previos = await db.entities.RateLimit.filter({ ip_hash: ipHash, kind: 'contacto' }, '-created_date', MENSAJES_POR_IP_POR_HORA);
      const masAntiguo = previos[previos.length - 1];
      if (previos.length >= MENSAJES_POR_IP_POR_HORA && masAntiguo && Date.now() - new Date(masAntiguo.created_date).getTime() < HOUR_MS) {
        return Response.json({ error: 'Has enviado varios mensajes seguidos. Prueba de nuevo dentro de un rato.' }, { status: 429 });
      }
      await db.entities.RateLimit.create({ ip_hash: ipHash, kind: 'contacto' });
    }

    const fullName = escapeHtml(`${name} ${lastName}`);
    const cuerpoMensaje = escapeHtml(message).replace(/\n/g, '<br>');

    await db.integrations.Core.SendEmail({
      from_name: 'Formulario de contacto - Menttio',
      to: BUZON,
      subject: `Nuevo mensaje de contacto de ${fullName}`,
      body: `<h2>Nuevo mensaje de contacto</h2>
<p><strong>Nombre completo:</strong> ${fullName}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Mensaje:</strong></p>
<p>${cuerpoMensaje}</p>
<hr>
<p style="color:#666;font-size:12px;">Enviado desde el formulario de contacto de menttio.com</p>`
    });

    try {
      await db.integrations.Core.SendEmail({
        from_name: 'Menttio',
        to: email,
        subject: 'Hemos recibido tu mensaje',
        body: `<h2>¡Gracias por escribirnos!</h2>
<p>Hola ${fullName}:</p>
<p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p>
<p><strong>Tu mensaje:</strong></p>
<p style="background:#f5f5f5;padding:15px;border-radius:8px;">${cuerpoMensaje}</p>
<p>Un saludo,<br><strong>El equipo de Menttio</strong></p>`
      });
    } catch (e) {
      console.error('Error enviando la confirmación:', e);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error en contactMessage:', error);
    return Response.json({ error: 'No se ha podido enviar el mensaje' }, { status: 500 });
  }
}
