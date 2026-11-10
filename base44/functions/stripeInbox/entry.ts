import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Dos secretos posibles. Desde que los cobros de clase son cargos directos, sus eventos
// nacen en la cuenta del profesor y solo llegan a un destino que escuche cuentas conectadas.
// Si ese destino es otro distinto del de las suscripciones, trae su propia firma, asi que se
// prueban los dos. Con un unico destino que escuche ambas cosas, sobra el segundo.
const secretosWebhook = [
  Deno.env.get('STRIPE_WEBHOOK_SECRET'),
  Deno.env.get('STRIPE_WEBHOOK_SECRET_CONNECT'),
].filter(Boolean);

async function verificar(body, signature) {
  let ultimoError = null;
  for (const secreto of secretosWebhook) {
    try {
      return await stripe.webhooks.constructEventAsync(body, signature, secreto);
    } catch (err) {
      ultimoError = err;
    }
  }
  throw ultimoError || new Error('No hay ningun secreto de webhook configurado');
}

// Recibe los avisos de Stripe. Sustituye a stripeHook / stripeEvents / stripeWebhook.
//
// Contexto: hasta hoy el webhook de Stripe apuntaba a https://www.menttio.com a secas, es
// decir, a la portada. Stripe recibia el HTML con un 200 y daba el aviso por entregado, pero
// no lo procesaba nadie. Por eso ningun pago con tarjeta marco nunca una clase como pagada.
//
// La cuenta envia con la version de API 2026-03-25.dahlia, que movio de sitio varios campos
// respecto a la que usa el SDK. De ahi que aqui se lean de forma defensiva, probando tanto la
// ubicacion nueva como la antigua: si Stripe vuelve a cambiarlas, esto no se rompe en silencio.
const POR_DEFECTO = {
  stripe_price_esencial_mensual: 'price_1UImwTHZYiECTxiywGeSWisR',
  stripe_price_esencial_anual: 'price_1UImwTHZYiECTxiygtqQyOWz',
  stripe_price_grabacion_mensual: 'price_1UImwUHZYiECTxiyGz44YV8B',
  stripe_price_grabacion_anual: 'price_1UImwVHZYiECTxiyFKnzG6m0',
};

async function catalogo(db) {
  const mapa = { ...POR_DEFECTO };
  try {
    const filas = await db.entities.AppSetting.list();
    for (const fila of filas) {
      if (fila.key in mapa && String(fila.value || '').startsWith('price_')) {
        mapa[fila.key] = fila.value.trim();
      }
    }
  } catch (e) {
    console.error('AppSetting:', e.message);
  }
  return mapa;
}

// A6 (lote E, 10/11/2026): el plan sale SOLO del id de precio. Antes, si el precio no estaba en
// el catalogo, se deducia del importe (>= 20 EUR al mes -> premium), asi que un precio
// desconocido podia dar premium. Ahora devuelve null y planSeguro conserva el plan que el
// profesor ya tenia (o basic), y deja aviso en los registros.
function planDesdePrecio(mapa, priceId) {
  if (priceId && (priceId === mapa.stripe_price_grabacion_mensual || priceId === mapa.stripe_price_grabacion_anual)) return 'premium';
  if (priceId && (priceId === mapa.stripe_price_esencial_mensual || priceId === mapa.stripe_price_esencial_anual)) return 'basic';
  return null;
}

function planSeguro(mapa, priceId, teacher) {
  const plan = planDesdePrecio(mapa, priceId);
  if (plan) return plan;
  console.error(`Precio desconocido ${priceId}: se conserva el plan del profesor ${teacher?.id}`);
  const actual = teacher?.subscription_plan;
  return actual === 'premium' || actual === 'basic' ? actual : 'basic';
}

/** El id de la suscripcion cambio de sitio en las versiones nuevas de la API. */
function subscriptionDeFactura(invoice) {
  return invoice?.subscription
    || invoice?.parent?.subscription_details?.subscription
    || invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
    || invoice?.lines?.data?.[0]?.subscription
    || null;
}

/** current_period_end paso de la suscripcion a cada linea. */
function finDePeriodo(subscription) {
  return subscription?.current_period_end
    || subscription?.items?.data?.[0]?.current_period_end
    || null;
}

function aFecha(unix) {
  return unix ? new Date(unix * 1000).toISOString().split('T')[0] : null;
}

async function profesorDeCliente(db, customerId) {
  if (!customerId) return null;
  const teachers = await db.entities.Teacher.filter({ stripe_customer_id: customerId });
  if (teachers.length > 0) return teachers[0];
  // Respaldo: si el profesor se registro sin pasar por el checkout, aun no tiene guardado
  // el cliente de Stripe. Se busca por correo y se deja anotado para la proxima vez.
  try {
    const cliente = await stripe.customers.retrieve(customerId);
    const email = cliente?.email;
    if (!email) return null;
    const porEmail = await db.entities.Teacher.filter({ user_email: email });
    if (porEmail.length > 0) {
      await db.entities.Teacher.update(porEmail[0].id, { stripe_customer_id: customerId });
      return porEmail[0];
    }
  } catch (e) {
    console.error('No se pudo resolver el cliente', customerId, e.message);
  }
  return null;
}

// --- Cobros de clase (lote E, 10/11/2026: P14 y P16) ---

const ADMIN_AVISOS = 'menttio@menttio.com';

// Lo que no se puede resolver solo (importe raro, cuenta equivocada, cobro doble, reembolso
// parcial, disputa) se avisa por correo en vez de tocar la reserva.
async function avisarAdmin(db, asunto, texto) {
  console.error(`AVISO: ${asunto} | ${texto}`);
  try {
    await db.integrations.Core.SendEmail({
      to: ADMIN_AVISOS,
      subject: `[Menttio pagos] ${asunto}`,
      from_name: 'Menttio',
      body: `<p>${texto}</p><p>Revisalo en el panel de Stripe (cuenta del profesor) y en la reserva.</p>`,
    });
  } catch (e) {
    console.error('No se pudo enviar el aviso:', e.message);
  }
}

// Los reembolsos y disputas no traen la reserva: se saca de los metadatos del PaymentIntent,
// que classPayment rellena al crear el cobro en la cuenta del profesor.
async function reservaDePago(db, paymentIntentId, cuenta) {
  let meta = {};
  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {}, cuenta ? { stripeAccount: cuenta } : undefined);
      meta = pi?.metadata || {};
    } catch (e) {
      console.error('PaymentIntent', paymentIntentId, e.message);
    }
  }
  const id = meta.booking_id || meta.bookingId;
  const booking = id ? await db.entities.Booking.get(String(id)).catch(() => null) : null;
  return { booking, meta, bookingId: id || null };
}

// Apunta el estado de pago de un alumno. En las clases de grupo cada alumno tiene el suyo
// (P16): antes el primer pago marcaba la reserva entera como pagada y los demas ya no podian
// pagar. La reserva solo pasa a 'paid' cuando han pagado todos.
// Devuelve 'ok', 'ya' (ya estaba asi: reintento de Stripe), 'otro_pago' o 'no_alumno'.
async function registrarPago(db, booking, correo, estado, piId) {
  if (booking.class_type === 'group') {
    const lista = Array.isArray(booking.enrolled_students) ? booking.enrolled_students : [];
    const i = lista.findIndex((s) => String(s?.student_email || '').toLowerCase() === correo);
    if (i < 0) return 'no_alumno';
    if (lista[i].payment_status === estado) return estado === 'paid' ? 'otro_pago' : 'ya';
    const nueva = lista.map((s, j) => (j === i ? { ...s, payment_status: estado } : s));
    const todos = nueva.length > 0 && nueva.every((s) => s?.payment_status === 'paid');
    await db.entities.Booking.update(booking.id, {
      enrolled_students: nueva,
      payment_method: 'stripe',
      payment_status: todos ? 'paid' : 'pending',
    });
    return 'ok';
  }
  if (booking.payment_status === estado) {
    return booking.stripe_payment_id === piId ? 'ya' : 'otro_pago';
  }
  await db.entities.Booking.update(booking.id, {
    payment_status: estado,
    payment_method: 'stripe',
    stripe_payment_id: piId,
  });
  return 'ok';
}

// Eventos que se aceptan de una cuenta conectada (la del profesor). Las suscripciones y
// facturas solo valen si vienen de la cuenta de Menttio: si un profesor tiene sus propios
// clientes o suscripciones en su cuenta de Stripe, no deben tocar ninguna ficha.
const EVENTOS_DE_CUENTA_CONECTADA = ['checkout.session.completed', 'charge.refunded', 'charge.dispute.created'];

export default async function(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await verificar(body, signature);
  } catch (err) {
    console.error('Firma del webhook no valida:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createClientFromRequest(req).asServiceRole;
  // event.account solo viene cuando el evento nace en una cuenta conectada: es como se
  // distingue el cobro de una clase (cuenta del profesor) de una suscripcion (cuenta Menttio).
  console.log(`Evento ${event.type} (API ${event.api_version || 'sin version'})${event.account ? ` de la cuenta ${event.account}` : ''}`);

  if (event.account && !EVENTOS_DE_CUENTA_CONECTADA.includes(event.type)) {
    console.log(`Ignorado: ${event.type} de una cuenta conectada`);
    return Response.json({ received: true }, { status: 200 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          console.log('Checkout de suscripcion; se gestiona en invoice.payment_succeeded');
          break;
        }
        const bookingId = session.metadata?.booking_id || session.metadata?.bookingId || session.client_reference_id;
        if (!bookingId) {
          console.warn('checkout.session.completed sin identificador de reserva');
          break;
        }
        // P14: antes se marcaba como pagada sin mirar nada mas. Ahora se comprueba que el
        // cobro se hizo de verdad, en la cuenta del profesor de esa reserva y por su importe.
        if (session.payment_status !== 'paid') {
          console.warn(`Sesion ${session.id} completada sin cobro (${session.payment_status})`);
          break;
        }
        const piId = session.payment_intent || session.id;
        const booking = await db.entities.Booking.get(String(bookingId)).catch(() => null);
        if (!booking) {
          await avisarAdmin(db, 'Cobro sin reserva', `Stripe cobro la sesion ${session.id} (pago ${piId}, cuenta ${event.account || 'Menttio'}) para la reserva ${bookingId}, que no existe. Probablemente hay que reembolsarlo.`);
          break;
        }
        const teacher = await db.entities.Teacher.get(String(booking.teacher_id)).catch(() => null);
        const cuenta = teacher?.stripe_connect_account_id || null;
        if (!event.account || event.account !== cuenta) {
          await avisarAdmin(db, 'Cobro en otra cuenta', `La reserva ${booking.id} se cobro en la cuenta ${event.account || 'de Menttio'} y la del profesor es ${cuenta || 'ninguna'}. No se ha marcado como pagada.`);
          break;
        }
        const esperado = Math.round(Number(booking.price) * 100);
        if (String(session.currency || '').toLowerCase() !== 'eur' || Number(session.amount_total) !== esperado) {
          await avisarAdmin(db, 'Importe distinto', `La reserva ${booking.id} cuesta ${esperado / 100} EUR y se cobraron ${Number(session.amount_total) / 100} ${session.currency} (pago ${piId}). No se ha marcado como pagada.`);
          break;
        }
        const correo = String(session.metadata?.student_email || session.customer_details?.email || '').toLowerCase();
        const r = await registrarPago(db, booking, correo, 'paid', piId);
        if (r === 'ok') console.log(`Reserva ${booking.id} pagada por ${correo || 'el alumno'}`);
        else if (r === 'ya') console.log(`Reserva ${booking.id}: pago ${piId} ya registrado (reintento)`);
        else if (r === 'otro_pago') await avisarAdmin(db, 'Posible cobro doble', `La reserva ${booking.id} ya estaba pagada por ${correo || 'el alumno'} y ha entrado otro cobro (${piId}). Si es doble, reembolsa uno en Stripe.`);
        else await avisarAdmin(db, 'Pago de alguien que no esta en la clase', `${correo} pago la clase de grupo ${booking.id} (pago ${piId}) pero no figura entre los alumnos.`);
        if (booking.status === 'cancelled') {
          await avisarAdmin(db, 'Pago de una clase cancelada', `La reserva ${booking.id} estaba cancelada y se ha cobrado (pago ${piId}). Seguramente hay que reembolsarlo.`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = subscriptionDeFactura(invoice);
        if (!subscriptionId) {
          console.log('Factura sin suscripcion asociada; nada que hacer');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items?.data?.[0];
        const mapa = await catalogo(db);
        const expira = aFecha(finDePeriodo(subscription));

        const teacher = await profesorDeCliente(db, invoice.customer);
        if (!teacher) {
          console.warn(`Sin profesor para el cliente ${invoice.customer}`);
          break;
        }
        const plan = planSeguro(mapa, item?.price?.id, teacher);
        await db.entities.Teacher.update(teacher.id, {
          subscription_active: true,
          subscription_plan: plan,
          ...(expira ? { subscription_expires: expira } : {}),
          stripe_subscription_id: subscriptionId,
          trial_active: false,
          trial_used: true,
        });
        console.log(`Suscripcion activada para ${teacher.id} (${plan}, hasta ${expira})`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Se relee de Stripe: los avisos pueden llegar desordenados y el del evento podria
        // ser una foto antigua (p. ej. un 'updated' viejo despues de la cancelacion).
        const subscription = await stripe.subscriptions.retrieve(event.data.object.id).catch(() => event.data.object);

        // Antes esto solo miraba el estado 'trialing' y se iba en cualquier otro caso. Con lo
        // cual, cuando una prueba terminaba sin pagar, Menttio no se enteraba nunca: el
        // profesor se quedaba con subscription_active a true para siempre, con acceso
        // completo y gratis. Ahora se traduce cada estado de Stripe a acceso o no acceso.
        //
        // past_due conserva el acceso a proposito: Stripe sigue reintentando el cobro durante
        // unas tres semanas antes de rendirse, y ese es el margen de cortesia. Al llegar a
        // unpaid o canceled se corta.
        const estado = subscription.status;
        const enPrueba = estado === 'trialing';
        const activa = enPrueba || estado === 'active' || estado === 'past_due';

        const item = subscription.items?.data?.[0];
        const mapa = await catalogo(db);
        const finPrueba = aFecha(subscription.trial_end);
        const expira = aFecha(finDePeriodo(subscription)) || finPrueba;

        const teacher = await profesorDeCliente(db, subscription.customer);
        if (!teacher) break;
        const plan = planSeguro(mapa, item?.price?.id, teacher);

        await db.entities.Teacher.update(teacher.id, {
          subscription_active: activa,
          subscription_plan: plan,
          trial_active: enPrueba,
          ...(enPrueba && finPrueba ? { trial_end_date: finPrueba } : {}),
          ...(expira ? { subscription_expires: expira } : {}),
          stripe_subscription_id: subscription.id,
        });

        // La prueba se da por usada cuando la suscripcion existe de verdad, no cuando se abre
        // la pantalla de pago: quien la abria y la cerraba sin terminar se quedaba sin prueba.
        if (enPrueba) {
          try {
            const correo = teacher.user_email;
            if (correo) {
              const yaProbo = await db.entities.TrialUsed.filter({ email: correo });
              if (yaProbo.length === 0) {
                await db.entities.TrialUsed.create({
                  email: correo,
                  used_date: new Date().toISOString().split('T')[0],
                });
              }
            }
          } catch (e) {
            console.error('TrialUsed (no critico):', e.message);
          }
        }

        console.log(`Suscripcion de ${teacher.id}: ${estado} -> ${activa ? 'con acceso' : 'sin acceso'} (${plan}, hasta ${expira})`);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe lo lanza 3 dias antes de que termine la prueba. Con este modelo no hay
        // tarjeta guardada, asi que nadie va a cobrar solo: este correo es literalmente el
        // unico momento en que el profesor decide si sigue. Sin el, el dia 15 se encuentra la
        // puerta cerrada sin haberlo visto venir, que es la peor forma de perder un cliente.
        const subscription = event.data.object;
        const teacher = await profesorDeCliente(db, subscription.customer);
        if (!teacher || !teacher.user_email) break;

        const fin = aFecha(subscription.trial_end);
        const cuando = fin ? new Date(fin + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'dentro de tres dias';
        const nombre = (teacher.full_name || '').split(' ')[0] || 'Hola';

        try {
          await db.integrations.Core.SendEmail({
            to: teacher.user_email,
            subject: 'Te quedan 3 dias de prueba en Menttio',
            from_name: 'Menttio',
            body: `<p>${nombre},</p>
<p>Tu prueba de Menttio termina el <strong>${cuando}</strong>. A partir de ese dia, para seguir usandola hay que elegir plan: no se te ha cobrado nada hasta ahora y no hay ningun cargo pendiente.</p>
<p>Si quieres continuar, entra en Menttio y te lo pedira al abrir. Si no, no tienes que hacer nada: tu cuenta se queda parada y tus datos siguen ahi por si vuelves.</p>
<p>Y si lo dejas, te agradeceria mucho que me contestaras a este correo diciendome por que. Es lo que mas me sirve.</p>
<p>Raul — Menttio</p>`,
          });
          console.log(`Aviso de fin de prueba enviado a ${teacher.user_email} (termina ${fin})`);
        } catch (e) {
          console.error('No se pudo avisar del fin de prueba:', e.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // No se corta el acceso aqui: Stripe reintenta durante semanas y avisara por
        // customer.subscription.updated cuando de la suscripcion por perdida. Esto solo deja
        // rastro para poder verlo en los registros sin entrar en el panel de Stripe.
        const invoice = event.data.object;
        const teacher = await profesorDeCliente(db, invoice.customer);
        console.warn(
          `Cobro fallido de ${invoice.amount_due != null ? invoice.amount_due / 100 : '?'} EUR` +
          `${teacher ? ` al profesor ${teacher.id} (${teacher.user_email})` : ` del cliente ${invoice.customer}`}` +
          `; intento ${invoice.attempt_count ?? '?'}`,
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teacher = await profesorDeCliente(db, subscription.customer);
        if (!teacher) break;
        await db.entities.Teacher.update(teacher.id, {
          subscription_active: false,
          trial_active: false,
          stripe_subscription_id: null,
        });
        console.log(`Suscripcion desactivada para ${teacher.id}`);
        break;
      }

      // Reembolsos y disputas de cobros de clase (cuenta del profesor). Para que lleguen, el
      // destino de cuentas conectadas tiene que escuchar charge.refunded y charge.dispute.created.
      case 'charge.refunded': {
        if (!event.account) break; // reembolsos de la cuenta de Menttio (suscripciones): nada que hacer
        const charge = event.data.object;
        const { booking, meta, bookingId } = await reservaDePago(db, charge.payment_intent, event.account);
        if (!booking) {
          await avisarAdmin(db, 'Reembolso sin reserva', `Reembolso del pago ${charge.payment_intent} (cuenta ${event.account}); reserva ${bookingId || 'desconocida'} no encontrada.`);
          break;
        }
        if (Number(charge.amount_refunded) < Number(charge.amount)) {
          await avisarAdmin(db, 'Reembolso parcial', `Reserva ${booking.id}: reembolsados ${Number(charge.amount_refunded) / 100} de ${Number(charge.amount) / 100} EUR. La reserva sigue como pagada.`);
          break;
        }
        const correo = String(meta.student_email || '').toLowerCase();
        const r = await registrarPago(db, booking, correo, 'refunded', charge.payment_intent);
        console.log(`Reembolso total de la reserva ${booking.id} (${correo}): ${r}`);
        break;
      }

      case 'charge.dispute.created': {
        if (!event.account) break;
        const dispute = event.data.object;
        const { booking, bookingId } = await reservaDePago(db, dispute.payment_intent, event.account);
        await avisarAdmin(db, 'Disputa de un pago', `El alumno ha abierto una disputa (${dispute.reason || 'sin motivo'}) por ${Number(dispute.amount) / 100} EUR del pago ${dispute.payment_intent}, reserva ${booking?.id || bookingId || 'desconocida'}, cuenta ${event.account}. Hay que responder en Stripe antes de la fecha limite.`);
        break;
      }

      default:
        // El destino escucha 236 tipos de evento; la inmensa mayoria no nos interesan.
        break;
    }
  } catch (err) {
    console.error(`Error procesando ${event.type}:`, err.message);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
}
