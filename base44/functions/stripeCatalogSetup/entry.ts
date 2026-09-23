import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe@17.5.0';

// Crea en Stripe los precios del catálogo nuevo y guarda sus identificadores en AppSetting.
// Solo la puede ejecutar el administrador. Es idempotente: cada precio lleva un lookup_key,
// así que volver a llamarla devuelve el que ya existe en vez de duplicarlo.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

const CATALOGO = [
  {
    plan: 'esencial',
    producto: 'Menttio Esencial',
    descripcion: 'Agenda, cobros, apuntes e informe mensual para la familia.',
    precios: [
      { clave: 'stripe_price_esencial_mensual', lookup_key: 'menttio_esencial_mensual', importe: 1299, intervalo: 'month' },
      { clave: 'stripe_price_esencial_anual', lookup_key: 'menttio_esencial_anual', importe: 13000, intervalo: 'year' },
    ],
  },
  {
    plan: 'grabacion',
    producto: 'Menttio Completo',
    descripcion: 'Todo lo de Esencial y además la videollamada se graba sola para que el alumno la repase.',
    precios: [
      { clave: 'stripe_price_grabacion_mensual', lookup_key: 'menttio_grabacion_mensual', importe: 2999, intervalo: 'month' },
      { clave: 'stripe_price_grabacion_anual', lookup_key: 'menttio_grabacion_anual', importe: 30000, intervalo: 'year' },
    ],
  },
];

async function buscarProducto(plan) {
  try {
    const res = await stripe.products.search({ query: `metadata['menttio_plan']:'${plan}'`, limit: 1 });
    if (res.data.length > 0) return res.data[0];
  } catch (e) {
    console.error('products.search:', e.message);
  }
  return null;
}

async function guardar(db, key, value, note) {
  const previos = await db.entities.AppSetting.filter({ key });
  if (previos.length > 0) {
    await db.entities.AppSetting.update(previos[0].id, { value, note });
  } else {
    await db.entities.AppSetting.create({ key, value, note });
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo el administrador puede ejecutar esto' }, { status: 403 });
    }
    const db = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const aplicar = body.aplicar === true;
    const salida = { aplicar, precios: {}, creados: [], existentes: [], errores: [] };

    // Saber a qué cuenta se está escribiendo antes de crear nada.
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
          for (const p of item.precios) {
            salida.precios[p.clave] = `se creará: ${(p.importe / 100).toFixed(2)} € cada ${p.intervalo === 'year' ? 'año' : 'mes'}`;
          }
          continue;
        }
        producto = await stripe.products.create({
          name: item.producto,
          description: item.descripcion,
          metadata: { menttio_plan: item.plan },
        });
        salida.creados.push(`producto ${item.producto}`);
      } else {
        salida.existentes.push(`producto ${item.producto}`);
      }

      for (const p of item.precios) {
        try {
          const yaHay = await stripe.prices.list({ lookup_keys: [p.lookup_key], limit: 1 });
          if (yaHay.data.length > 0) {
            salida.precios[p.clave] = yaHay.data[0].id;
            salida.existentes.push(`precio ${p.lookup_key}`);
            if (aplicar) await guardar(db, p.clave, yaHay.data[0].id, `${item.producto} — ${(p.importe / 100).toFixed(2)} €/${p.intervalo}`);
            continue;
          }
          if (!aplicar) {
            salida.precios[p.clave] = `se creará: ${(p.importe / 100).toFixed(2)} € cada ${p.intervalo === 'year' ? 'año' : 'mes'}`;
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
          salida.precios[p.clave] = precio.id;
          salida.creados.push(`precio ${p.lookup_key}`);
          await guardar(db, p.clave, precio.id, `${item.producto} — ${(p.importe / 100).toFixed(2)} €/${p.intervalo}`);
        } catch (e) {
          salida.errores.push(`${p.lookup_key}: ${e.message}`);
        }
      }
    }

    return Response.json(salida);
  } catch (error) {
    console.error('stripeCatalogSetup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
