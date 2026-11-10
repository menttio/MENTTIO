import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lote E3 (10/11/2026): P5. Unica puerta para escribir la ficha del profesor desde la app.
//
// Antes la regla de Teacher dejaba al profesor cambiar cualquier campo de su ficha, asi que
// podia darse premium, la exencion, un 0 % de comision, una prueba eterna o el sello de
// verificado desde la consola del navegador. Ahora la regla solo deja escribir al servidor:
// esta funcion acepta los datos de perfil y descarta siempre los de facturacion y verificacion,
// que solo cambian Stripe (stripeInbox), las funciones de suscripcion y el administrador.
//
// Acciones:
//   crear       {perfil, plan}  alta del profesor; la prueba y el plan los decide el servidor
//   actualizar  {id?, campos}   datos de perfil
//   elegir_comision             pasar al plan sin cuota (10 %), como en RenewSubscription

const err = (error: string, status = 400) => Response.json({ error }, { status });

// Lo unico que el profesor puede escribir.
const PERFIL = new Set([
  'full_name', 'phone', 'education', 'experience_years', 'profile_photo', 'bio', 'subjects',
  'teaching_methods', 'specializations', 'languages', 'certifications',
  'tour_completed', 'availability_tour_completed', 'calendar_tour_completed', 'subjects_tour_completed',
  'workload_tour_completed', 'profile_tour_completed', 'students_tour_completed',
]);

const DIAS_PRUEBA = 30;
const hoy = () => new Date().toISOString().split('T')[0];

function soloPerfil(campos: any) {
  const limpio: Record<string, unknown> = {};
  const ignorados: string[] = [];
  for (const [k, v] of Object.entries(campos || {})) {
    if (PERFIL.has(k)) limpio[k] = v;
    else ignorados.push(k);
  }
  return { limpio, ignorados };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err('Tienes que iniciar sesion', 401);
    const correo = String(user.email || '');
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole;
    const accion = String(body.accion || '');

    const fichas = await db.entities.Teacher.filter({ user_email: correo }).catch(() => []);
    const actual = fichas[0] || null;

    if (accion === 'crear') {
      const { limpio, ignorados } = soloPerfil(body.perfil);
      // Si ya existe, solo se actualiza el perfil: repetir el alta no da otra prueba.
      if (actual) {
        const teacher = await db.entities.Teacher.update(actual.id, limpio);
        return Response.json({ teacher, ya_existia: true, ignorados });
      }
      const plan = ['basic', 'premium', 'commission'].includes(body.plan) ? body.plan : 'basic';
      let facturacion: Record<string, unknown>;
      if (plan === 'commission') {
        facturacion = {
          subscription_plan: 'commission', subscription_active: true, subscription_expires: null,
          commission_percentage: 10, trial_used: false, trial_active: false, trial_start_date: null, trial_end_date: null,
        };
      } else {
        // Una sola prueba por correo. Antes lo comprobaba el navegador leyendo TrialUsed, que
        // solo puede leer el administrador: la comprobacion nunca encontraba nada y la prueba
        // se podia encadenar.
        const usadas = await db.entities.TrialUsed.filter({ email: correo }).catch(() => []);
        const prueba = usadas.length === 0;
        const fin = new Date();
        fin.setDate(fin.getDate() + DIAS_PRUEBA);
        const finStr = fin.toISOString().split('T')[0];
        facturacion = {
          subscription_plan: plan,
          subscription_active: prueba,
          subscription_expires: prueba ? finStr : null,
          trial_used: !prueba,
          trial_active: prueba,
          trial_start_date: prueba ? hoy() : null,
          trial_end_date: prueba ? finStr : null,
        };
        if (prueba) await db.entities.TrialUsed.create({ email: correo, used_date: hoy() }).catch(() => null);
      }
      const teacher = await db.entities.Teacher.create({
        bio: '', subjects: [], tour_completed: false,
        ...limpio,
        user_email: correo,
        rating: 0,
        total_classes: 0,
        verified: false,
        ...facturacion,
      });
      return Response.json({ teacher, ignorados });
    }

    if (!actual) return err('No tienes ficha de profesor', 404);

    if (accion === 'actualizar') {
      if (body.id && String(body.id) !== String(actual.id)) return err('Esa ficha no es tuya', 403);
      const { limpio, ignorados } = soloPerfil(body.campos);
      if (ignorados.length) console.warn(`teacherAccount: ${correo} intento cambiar ${ignorados.join(', ')} (ignorado)`);
      const teacher = Object.keys(limpio).length ? await db.entities.Teacher.update(actual.id, limpio) : actual;
      return Response.json({ teacher, ignorados });
    }

    // Lote F (P18): horario semanal del profesor. Antes cualquiera podia crear huecos de
    // disponibilidad a nombre de cualquier profesor (la regla de Availability no lo impedia).
    if (accion === 'disponibilidad') {
      const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
      const dias = Array.isArray(body.horario) ? body.horario.slice(0, 7) : null;
      if (!dias) return err('Horario no valido');
      const limpio = [];
      for (const d of dias) {
        const dia = Number(d?.day_of_week);
        const tramos = (Array.isArray(d?.time_slots) ? d.time_slots : []).slice(0, 24)
          .filter((t: any) => HORA.test(String(t?.start_time)) && HORA.test(String(t?.end_time)) && t.start_time < t.end_time)
          .map((t: any) => ({ start_time: t.start_time, end_time: t.end_time }));
        if (!Number.isInteger(dia) || dia < 0 || dia > 6) return err('Dia no valido');
        if (tramos.length) limpio.push({ day_of_week: dia, time_slots: tramos });
      }
      const actuales = await db.entities.Availability.filter({ teacher_id: actual.id, type: 'regular' }).catch(() => []);
      for (const a of actuales) await db.entities.Availability.delete(a.id);
      for (const d of limpio) {
        await db.entities.Availability.create({ teacher_id: actual.id, type: 'regular', ...d });
      }
      return Response.json({ ok: true, dias: limpio.length });
    }

    if (accion === 'elegir_comision') {
      if (actual.subscription_exempt) return err('Tu cuenta esta exenta: no necesitas cambiar de plan', 409);
      if (actual.stripe_subscription_id && actual.subscription_active && !actual.trial_active) {
        return err('Tienes una suscripcion activa: cancelala antes de pasar al plan sin cuota', 409);
      }
      const teacher = await db.entities.Teacher.update(actual.id, {
        subscription_plan: 'commission',
        subscription_active: true,
        subscription_expires: null,
        stripe_subscription_id: null,
        trial_active: false,
        commission_percentage: 10,
      });
      return Response.json({ teacher });
    }

    return err('Accion no valida');
  } catch (e) {
    console.error('teacherAccount:', (e as Error)?.message);
    return err('Error interno', 500);
  }
});
