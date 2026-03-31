import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const webhookUrl = Deno.env.get('N8N_DELETE_TEACHER_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'N8N_DELETE_TEACHER_WEBHOOK_URL not configured' }, { status: 500 });
    }

    // Obtener todos los profesores premium sin suscripción activa y sin trial activo
    const allTeachers = await base44.asServiceRole.entities.Teacher.list();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const unpaidPremium = allTeachers.filter(t => {
      if (t.subscription_plan !== 'premium') return false;
      if (t.subscription_active) return false;
      if (t.trial_active) return false;
      if (t.subscription_exempt) return false;
      if (!t.created_date) return false;

      const createdAt = new Date(t.created_date);
      return createdAt < oneHourAgo;
    });

    console.log(`✅ Profesores premium sin pagar encontrados: ${unpaidPremium.length}`);

    if (unpaidPremium.length === 0) {
      return Response.json({ success: true, message: 'No unpaid premium teachers found', count: 0 });
    }

    // Filtrar solo los que tienen email corporativo @menttio.com (igual que deleteAccount)
    const toDelete = unpaidPremium.filter(t => t.corporate_email && t.corporate_email.includes('@menttio.com'));

    if (toDelete.length === 0) {
      return Response.json({ success: true, message: 'No corporate accounts to delete', count: 0 });
    }

    // Enviar un webhook por profesor, mismo payload que deleteAccount
    const results = [];
    for (const t of toDelete) {
      const payload = {
        primaryEmail: t.corporate_email,
        googleUserId: t.corporate_email
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      results.push({ email: t.corporate_email, ok: response.ok, status: response.status });
      console.log(`Webhook sent for ${t.corporate_email}: ${response.status}`);
    }

    console.log(`✅ Webhooks enviados: ${toDelete.length}`);
    return Response.json({ success: true, count: toDelete.length, results });

  } catch (error) {
    console.error('Error en cleanupUnpaidPremium:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});