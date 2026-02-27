import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;
    console.log(`Deleting account for user: ${userEmail}`);

    // Delete Teacher profile and related data
    const teachers = await base44.asServiceRole.entities.Teacher.filter({ 
      user_email: userEmail 
    });
    
    if (teachers.length > 0) {
      const teacherId = teachers[0].id;
      const teacherData = teachers[0];
      
      // Send webhook to N8N ONLY for premium teachers (those with @menttio.com corporate email)
      console.log('Teacher data:', teacherData);
      console.log('Corporate email:', teacherData.corporate_email);
      console.log('Subscription plan:', teacherData.subscription_plan);
      
      // Cancelar suscripción en Stripe si existe
      if (teacherData.stripe_subscription_id) {
        try {
          console.log('💳 Cancelando suscripción en Stripe:', teacherData.stripe_subscription_id);
          
          // Obtener la suscripción actual de Stripe para saber si está en trial
          const subscription = await stripe.subscriptions.retrieve(teacherData.stripe_subscription_id);
          console.log('📋 Estado suscripción Stripe:', subscription.status);
          console.log('📋 Trial end:', subscription.trial_end);
          
          const isInTrial = subscription.status === 'trialing';
          
          if (isInTrial) {
            // Durante el período de prueba: cancelar inmediatamente
            console.log('⚡ En período de prueba - cancelando inmediatamente');
            await stripe.subscriptions.cancel(teacherData.stripe_subscription_id);
            console.log('✅ Suscripción cancelada inmediatamente (estaba en trial)');
          } else {
            // Fuera del período de prueba: cancelar al final del período actual
            console.log('📅 Fuera del período de prueba - cancelando al final del período actual');
            await stripe.subscriptions.update(teacherData.stripe_subscription_id, {
              cancel_at_period_end: true,
            });
            console.log('✅ Suscripción programada para cancelar al fin del período');
          }
        } catch (stripeError) {
          // Si el error es que la suscripción no existe, ignorar y continuar
          if (stripeError.code === 'resource_missing') {
            console.log('⚠️ Suscripción Stripe no encontrada (ya cancelada o inexistente)');
          } else {
            console.error('❌ Error cancelando suscripción en Stripe:', stripeError.message);
            // Continuar con la eliminación aunque falle Stripe
          }
        }
      } else {
        console.log('ℹ️ Profesor sin suscripción Stripe - omitiendo cancelación');
      }

      // Only send webhook if premium plan (corporate email with @menttio.com)
      if (teacherData.corporate_email && teacherData.corporate_email.includes('@menttio.com')) {
        try {
          const webhookUrl = Deno.env.get('N8N_DELETE_TEACHER_WEBHOOK_URL');
          console.log('Webhook URL:', webhookUrl);
          
          if (webhookUrl) {
            const payload = {
              primaryEmail: teacherData.corporate_email,
              googleUserId: teacherData.corporate_email
            };
            console.log('Sending webhook payload for premium teacher:', payload);
            
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });
            
            console.log('Webhook response status:', response.status);
            const responseText = await response.text();
            console.log('Webhook response body:', responseText);
            
            if (!response.ok) {
              console.error('Error notifying N8N webhook - Status:', response.status);
            } else {
              console.log('Successfully notified N8N to delete corporate account');
            }
          } else {
            console.error('N8N_DELETE_TEACHER_WEBHOOK_URL not found in environment');
          }
        } catch (webhookError) {
          console.error('Error calling N8N webhook:', webhookError);
          console.error('Webhook error stack:', webhookError.stack);
          // Continue with deletion even if webhook fails
        }
      } else {
        console.log('Basic plan teacher (no @menttio.com email) - skipping webhook');
      }
      
      // Delete availability
      const availabilities = await base44.asServiceRole.entities.Availability.filter({ 
        teacher_id: teacherId 
      });
      for (const availability of availabilities) {
        await base44.asServiceRole.entities.Availability.delete(availability.id);
      }
      
      // Delete reviews
      const reviews = await base44.asServiceRole.entities.Review.filter({ 
        teacher_id: teacherId 
      });
      for (const review of reviews) {
        await base44.asServiceRole.entities.Review.delete(review.id);
      }
      
      // Delete teacher profile
      await base44.asServiceRole.entities.Teacher.delete(teacherId);
      console.log(`Deleted teacher profile: ${teacherId}`);
    }
    
    // Delete Student profile and related data
    const students = await base44.asServiceRole.entities.Student.filter({ 
      user_email: userEmail 
    });
    
    if (students.length > 0) {
      const studentId = students[0].id;
      
      // Delete student profile
      await base44.asServiceRole.entities.Student.delete(studentId);
      console.log(`Deleted student profile: ${studentId}`);
    }

    // Delete bookings
    const bookings = await base44.asServiceRole.entities.Booking.filter({ 
      $or: [
        { student_email: userEmail },
        { teacher_email: userEmail }
      ]
    });
    for (const booking of bookings) {
      await base44.asServiceRole.entities.Booking.delete(booking.id);
    }
    console.log(`Deleted ${bookings.length} bookings`);

    // Delete conversations
    const conversations = await base44.asServiceRole.entities.Conversation.filter({ 
      $or: [
        { student_email: userEmail },
        { teacher_email: userEmail }
      ]
    });
    for (const conversation of conversations) {
      // Delete messages in conversation
      const messages = await base44.asServiceRole.entities.Message.filter({ 
        conversation_id: conversation.id 
      });
      for (const message of messages) {
        await base44.asServiceRole.entities.Message.delete(message.id);
      }
      await base44.asServiceRole.entities.Conversation.delete(conversation.id);
    }
    console.log(`Deleted ${conversations.length} conversations`);

    // Delete notifications
    const notifications = await base44.asServiceRole.entities.Notification.filter({ 
      user_email: userEmail 
    });
    for (const notification of notifications) {
      await base44.asServiceRole.entities.Notification.delete(notification.id);
    }
    console.log(`Deleted ${notifications.length} notifications`);

    // Delete push subscriptions
    const pushSubscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ 
      user_email: userEmail 
    });
    for (const subscription of pushSubscriptions) {
      await base44.asServiceRole.entities.PushSubscription.delete(subscription.id);
    }
    console.log(`Deleted ${pushSubscriptions.length} push subscriptions`);

    // Logout user
    console.log(`Account deletion completed for: ${userEmail}`);
    
    return Response.json({ 
      success: true,
      message: 'Cuenta eliminada correctamente'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});