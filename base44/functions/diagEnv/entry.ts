// TEMPORAL: diagnóstico de por qué las reservas no llegan al worker.
//
// No devuelve ningún secreto: solo si cada variable está puesta, su longitud y el dominio al
// que apunta cuando es una URL. Suficiente para saber si apunta al worker o al n8n muerto.
// Solo responde con la clave compartida, que tiene el worker.
function resumenUrl(v) {
  if (!v) return { puesta: false };
  try {
    const u = new URL(v);
    return { puesta: true, dominio: u.hostname, ruta: u.pathname, lleva_clave: u.searchParams.has('key') };
  } catch (_e) {
    return { puesta: true, no_es_url: true, longitud: String(v).length };
  }
}

export default async function(req) {
  const clave = Deno.env.get('AUTOMATION_SECRET');
  if (!clave || req.headers.get('x-automation-key') !== clave) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const urls = [
    'N8N_WEBHOOK_URL',
    'N8N_CANCEL_WEBHOOK_URL',
    'N8N_MODIFY_WEBHOOK_URL',
    'BASE44_FUNCTIONS_URL',
  ];
  const otras = ['AUTOMATION_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GOOGLE_SHEETS_API_KEY'];

  const salida = { urls: {}, otras: {} };
  for (const k of urls) salida.urls[k] = resumenUrl(Deno.env.get(k));
  for (const k of otras) {
    const v = Deno.env.get(k);
    salida.otras[k] = { puesta: Boolean(v), longitud: v ? String(v).length : 0 };
  }

  // Prueba real: se llama a la URL de reservas con un cuerpo vacío y se informa del código.
  // Un 400 significa que llega y la rechaza por contenido; un 401, que la clave no vale.
  const destino = Deno.env.get('N8N_WEBHOOK_URL');
  if (destino) {
    try {
      const r = await fetch(destino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnostico: true }),
      });
      salida.prueba = { codigo: r.status, respuesta: (await r.text()).slice(0, 200) };
    } catch (e) {
      salida.prueba = { error: e.message };
    }
  }

  return Response.json(salida);
}
