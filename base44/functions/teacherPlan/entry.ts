import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// La automatizacion necesita saber si un profesor tiene derecho a grabar sus clases, para
// decidir si le hace coanfitrion de la videollamada. Antes esto se deducia de que su correo
// acabara en @menttio.com, que es justo lo que queremos dejar de usar.
//
// Solo responde con la clave compartida o a un administrador, y devuelve lo minimo: el plan
// y si puede grabar. Ningun dato personal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const clave = Deno.env.get('AUTOMATION_SECRET');
    const esAutomatizacion = clave && req.headers.get('x-automation-key') === clave;

    if (!esAutomatizacion) {
      const user = await base44.auth.me().catch(() => null);
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      return Response.json({ error: 'email requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const teachers = await db.entities.Teacher.filter({ user_email: email });
    const teacher = teachers[0];

    if (!teacher) {
      return Response.json({ encontrado: false, plan: null, puede_grabar: false });
    }

    const activo = Boolean(teacher.subscription_active || teacher.trial_active || teacher.subscription_exempt);
    const plan = teacher.subscription_plan || 'basic';
    // Solo el plan Completo incluye la grabacion. Durante la prueba gratuita tambien,
    // porque la prueba es del plan que ha elegido.
    const puedeGrabar = activo && plan === 'premium';

    return Response.json({
      encontrado: true,
      plan,
      activo,
      puede_grabar: puedeGrabar,
    });
  } catch (error) {
    console.error('teacherPlan:', error);
    return Response.json({ error: 'error interno' }, { status: 500 });
  }
}
