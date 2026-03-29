import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate limiting en memoria: máximo 5 intentos por IP en 10 minutos
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

Deno.serve(async (req) => {
  try {
    // Validación con secret compartido — esta función se invoca sin sesión activa
    // (el usuario aún no ha hecho login con la cuenta corporativa en este punto del flujo)
    const internalSecret = Deno.env.get('INTERNAL_API_SECRET');
    const requestSecret = req.headers.get('x-internal-secret');

    if (!internalSecret || requestSecret !== internalSecret) {
      console.warn('⚠️ createCorporateUser: acceso rechazado (secret inválido o ausente)');
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting por IP — máx. 5 peticiones cada 10 minutos
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    if (isRateLimited(clientIp)) {
      console.warn(`⚠️ Rate limit alcanzado para IP: ${clientIp}`);
      return Response.json(
        { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
        { status: 429 }
      );
    }

    const { nombre, apellidos, email_personal } = await req.json();

    if (!nombre || !apellidos) {
      return Response.json({ error: 'Nombre y apellidos son requeridos' }, { status: 400 });
    }

    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }

    console.log('✅ createCorporateUser invocado desde IP:', clientIp);

    const body = { nombre, apellidos };
    if (email_personal) body.email = email_personal;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Response status:', response.status);

    const rawText = await response.text();
    console.log('Raw response from n8n:', rawText);

    if (!response.ok) {
      throw new Error(`Error en el webhook de n8n: ${response.status} - ${rawText}`);
    }

    if (!rawText || rawText.trim() === '') {
      throw new Error('n8n no devolvió datos. Comprueba que el workflow de n8n está activo y configurado para responder con las credenciales.');
    }

    const parsed = JSON.parse(rawText);
    const result = Array.isArray(parsed) ? parsed[0] : parsed;

    // No devolver la contraseña al frontend — se comunica por email
    return Response.json({
      status: result.status,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName
    });

  } catch (error) {
    console.error('Error creating corporate user:', error);
    return Response.json({
      error: error.message || 'Error al crear usuario corporativo'
    }, { status: 500 });
  }
});