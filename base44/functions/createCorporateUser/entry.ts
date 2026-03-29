import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate limiting en memoria: máximo 5 intentos por IP en 10 minutos
// Protección adicional tras la autenticación obligatoria de sesión
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
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

Deno.serve(async (req) => {
  try {
    // 1. Autenticación obligatoria — protección principal
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limiting por IP — protección adicional
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    if (isRateLimited(clientIp)) {
      console.warn(`⚠️ Rate limit alcanzado para IP: ${clientIp}`);
      return Response.json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }, { status: 429 });
    }

    const { nombre, apellidos, email_personal } = await req.json();

    if (!nombre || !apellidos) {
      return Response.json({ error: 'Nombre y apellidos son requeridos' }, { status: 400 });
    }

    const webhookUrl = Deno.env.get('N8N_CREATE_USER_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'Webhook URL no configurada' }, { status: 500 });
    }

    console.log(`✅ createCorporateUser invocado por: ${user.email} desde IP: ${clientIp}`);

    const body = { nombre, apellidos };
    if (email_personal) body.email = email_personal;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const rawText = await response.text();
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Error en el webhook de n8n: ${response.status} - ${rawText}`);
    }

    if (!rawText || rawText.trim() === '') {
      throw new Error('n8n no devolvió datos. Comprueba que el workflow está activo.');
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
    return Response.json({ error: error.message || 'Error al crear usuario corporativo' }, { status: 500 });
  }
});