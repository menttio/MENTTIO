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

    // Enviar al webhook con la info mínima necesaria
    const payload = unpaidPremium.map(t => ({
      teacher_id: t.id,
      full_name: t.full_name,
      user_email: t.user_email,
      corporate_email: t.corporate_email || null,
      created_date: t.created_date,
      subscription_plan: t.subscription_plan
    }));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers: payload, triggered_at: new Date().toISOString() })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error enviando a n8n:', errorText);
      return Response.json({ error: 'Failed to notify n8n', details: errorText }, { status: 500 });
    }

    console.log(`✅ Webhook enviado a n8n con ${unpaidPremium.length} profesores`);
    return Response.json({ success: true, count: unpaidPremium.length, teachers: payload });

  } catch (error) {
    console.error('Error en cleanupUnpaidPremium:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});