import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

// Función de un solo uso: crea en Stripe los precios del catálogo nuevo y devuelve sus
// identificadores. Se borra en cuanto se han recogido. Es idempotente: cada precio lleva
// un lookup_key, así que volver a llamarla devuelve el que ya existe en vez de duplicarlo.
// Solo la puede ejecutar el administrador de la app.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

const CATALOGO = [
  { plan: 'esencial', producto: 'Menttio Esencial', descripcion: 'Agenda, cobros, apuntes e informe mensual para la familia.', precios: [
    { lookup_key: 'menttio_esencial_mensual', importe: 1299, intervalo: 'month' },
    { lookup_key: 'menttio_esencial_anual', importe: 13000, intervalo: 'year' },
  ] },
  { plan: 'grabacion', producto: 'Menttio Clase grabada', descripcion: 'Todo lo de Esencial y además la videollamada se graba sola para que el alumno la repase.', precios: [
    { lookup_key: 'menttio_grabacion_mensual', importe: 2999, intervalo: 'month' },
    { lookup_key: 'menttio_grabacion_anual', importe: 30000, intervalo: 'year' },
  ] },
];

async function buscarProducto(plan) {
  try {
    const res = await stripe.products.search({ query: `metadata['menttio_plan']:'${plan}'`, limit: 1 });
    if (res.data.length > 0) return res.data[0];
  } catch (e) {
    console.error('products.search no disponible:', e.message);
  }
  return null;
}

export default async function(req) {
  try {
    const user = await createClientFromRequest(req).auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo el administrador puede ejecutar esto' }, { status: 403 });
    }

    const aplicar = new URL(req.url).searchParams.get('aplicar') === 'true';
    const salida = { aplicar, productos: [], precios: {}, creados: [], existentes: [] };

    // Para saber a qué cuenta se está escribiendo antes de crear nada.
    try {
      const cuenta = await stripe.accounts.retrieve();
      salida.cuenta = { id: cuenta.id, pais: cuenta.country, moneda: cuenta.default_currency };
    } catch (e) {
      salida.cuenta = { error: e.message };
    }

    for (const item of CATALOGO) {
      let producto = await buscarProducto(item.plan);

      if (!producto) {
        if (!aplicar) {
          salida.productos.push({ plan: item.plan, accion: 'se crearía', nombre: item.producto });
          for (const p of item.precios) salida.precios[p.lookup_key] = `(se crearía) ${(p.importe / 100).toFixed(2)} € / ${p.intervalo}`;
          continue;
        }
        producto = await stripe.products.create({
          name: item.producto,
          description: item.descripcion,
          metadata: { menttio_plan: item.plan },
        });
        salida.creados.push(`producto ${item.producto} → ${producto.id}`);
      } else {
        salida.existentes.push(`producto ${item.producto} → ${producto.id}`);
      }
      salida.productos.push({ plan: item.plan, id: producto.id, nombre: producto.name });

      for (const p of item.precios) {
        const yaHay = await stripe.prices.list({ lookup_keys: [p.lookup_key], limit: 1 });
        if (yaHay.data.length > 0) {
          salida.precios[p.lookup_key] = yaHay.data[0].id;
          salida.existentes.push(`precio ${p.lookup_key} → ${yaHay.data[0].id}`);
          continue;
        }
        if (!aplicar) {
          salida.precios[p.lookup_key] = `(se crearía) ${(p.importe / 100).toFixed(2)} € / ${p.intervalo}`;
          continue;
        }
        const precio = await stripe.prices.create({
          product: producto.id,
          currency: 'eur',
          unit_amount: p.importe,
          recurring: { interval: p.intervalo },
          lookup_key: p.lookup_key,
          metadata: { menttio_plan: item.plan },
        });
        salida.precios[p.lookup_key] = precio.id;
        salida.creados.push(`precio ${p.lookup_key} → ${precio.id}`);
      }
    }

    return Response.json(salida);
  } catch (error) {
    console.error('stripePriceSetup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
