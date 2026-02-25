import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the payload from the automation
    const { event, data, old_data } = await req.json();
    
    console.log('🔔 notifyClassPaid triggered:', event);
    
    // Only proceed if payment_status changed to "paid"
    if (event.type === 'update' && data.payment_status === 'paid' && old_data?.payment_status !== 'paid') {
      console.log('💰 Clase marcada como pagada:', data.id);
      
      const webhookUrl = 'https://raulng16.app.n8n.cloud/webhook/clase_pagada';
      
      // Send webhook to N8N
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clase_id: data.id
        })
      });
      
      if (!webhookResponse.ok) {
        console.error('❌ Error enviando webhook a N8N:', await webhookResponse.text());
        return Response.json({ 
          error: 'Webhook failed',
          status: webhookResponse.status 
        }, { status: 500 });
      }
      
      console.log('✅ Webhook enviado correctamente a N8N');
      console.log('📤 Datos enviados:', { clase_id: data.id });
      
      return Response.json({ 
        success: true,
        message: 'Webhook sent',
        clase_id: data.id
      });
    } else {
      console.log('⏭️ No se requiere enviar webhook (no cambió a paid)');
      return Response.json({ 
        success: true,
        message: 'No action needed'
      });
    }
    
  } catch (error) {
    console.error('❌ Error en notifyClassPaid:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});