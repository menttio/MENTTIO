import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Mismo patron que markCompletedClasses: o viene del cron con el secreto compartido,
    // o de un admin con sesion iniciada.
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCron = cronSecret && req.headers.get('x-cron-secret') === cronSecret;

    if (!isCron) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Por que existe esto: la caducidad de la prueba se calculaba solo cuando el profesor
    // abria su perfil (getSubscriptionInfo o Layout). Un profesor que se registra y no vuelve
    // nunca se quedaba en trial_active para siempre, falseando las metricas: parecia que tenias
    // gente en prueba cuando en realidad hacia meses que se habian ido. Esto lo barre a diario.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const enPrueba = await base44.asServiceRole.entities.Teacher.filter({ trial_active: true });

    const caducados = [];

    for (const t of enPrueba) {
      // Los exentos tienen acceso indefinido concedido a mano: no se les toca.
      if (t.subscription_exempt) continue;
      // Sin fecha de fin no hay nada que decidir; lo dejamos para no inventar una caducidad.
      if (!t.trial_end_date) continue;

      const fin = new Date(t.trial_end_date + 'T23:59:59');
      if (fin >= hoy) continue;

      // El plan comision no tiene cuota mensual: al acabar la prueba el profesor sigue con
      // acceso. Los planes de pago (basic y premium) pasan a inactivo y la app les pedira
      // renovar la proxima vez que entren.
      const esComision = t.subscription_plan === 'commission';

      await base44.asServiceRole.entities.Teacher.update(t.id, {
        trial_active: false,
        trial_used: true,
        subscription_active: esComision,
        subscription_expires: esComision ? null : t.subscription_expires,
      });

      caducados.push({
        nombre: t.full_name,
        plan: t.subscription_plan,
        termino: t.trial_end_date,
        sigue_con_acceso: esComision,
      });
      console.log(`Prueba caducada: ${t.full_name} (${t.subscription_plan}, termino el ${t.trial_end_date})`);
    }

    return Response.json({
      success: true,
      revisados: enPrueba.length,
      caducados: caducados.length,
      detalle: caducados,
    });
  } catch (error) {
    console.error('Error caducando pruebas vencidas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
