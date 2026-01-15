import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, title, body, data } = await req.json();

    // Configure VAPID
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    webpush.setVapidDetails(
      'mailto:support@menpio.com',
      publicKey,
      privateKey
    );

    // Get all push subscriptions for the user
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email: userEmail
    });

    if (subscriptions.length === 0) {
      return Response.json({ message: 'No subscriptions found' }, { status: 200 });
    }

    // Send push notification to all user's devices
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon.png',
      badge: '/badge.png',
      data: data || {}
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification(sub.subscription, payload)
      )
    );

    // Remove invalid subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        await base44.asServiceRole.entities.PushSubscription.delete(subscriptions[i].id);
      }
    }

    return Response.json({ 
      success: true,
      sent: results.filter(r => r.status === 'fulfilled').length
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});