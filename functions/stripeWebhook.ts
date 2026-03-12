import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    // IMPORTANTE: Obtener body y signature PRIMERO
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // Verificar firma ANTES de inicializar Base44
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // AHORA inicializar Base44
    const base44 = createClientFromRequest(req);

    // Handle checkout completed (setup subscription)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('═══════════════════════════════════════════════════════');
      console.log('🔵 Stripe Webhook - checkout.session.completed');
      console.log('Session ID:', session.id);
      console.log('Metadata:', metadata);
      console.log('═══════════════════════════════════════════════════════');

      // Handle teacher subscription setup
      if (metadata.base44_user_email && metadata.subscription_plan) {
        console.log('📋 Configuración de suscripción de profesor detectada');
        console.log('Email:', metadata.base44_user_email);
        console.log('Plan:', metadata.subscription_plan);
        
        try {
          const teachers = await base44.asServiceRole.entities.Teacher.filter({
            user_email: metadata.base44_user_email
          });

          if (teachers.length > 0) {
            const teacher = teachers[0];
            console.log('✅ Profesor encontrado:', teacher.id);
            console.log('📅 Trial activo hasta:', teacher.trial_end_date);
            console.log('💳 Stripe Customer ID:', session.customer);
            console.log('💳 Stripe Subscription ID:', session.subscription);

            // Actualizar el profesor con los IDs de Stripe
            await base44.asServiceRole.entities.Teacher.update(teacher.id, {
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            });

            // Registrar el uso del trial: si la sesión de checkout tiene suscripción con trial en Stripe
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              if (subscription.trial_end) {
                const existingTrial = await base44.asServiceRole.entities.TrialUsed.filter({ email: metadata.base44_user_email });
                if (existingTrial.length === 0) {
                  await base44.asServiceRole.entities.TrialUsed.create({
                    email: metadata.base44_user_email,
                    used_date: new Date().toISOString().split('T')[0]
                  });
                  console.log('✅ Email registrado en TrialUsed');
                }
              }
            } catch (trialErr) {
              console.error('⚠️ Error registrando TrialUsed:', trialErr);
            }

            console.log('✅ Profesor actualizado con IDs de Stripe');
            console.log('⏰ El cobro se realizará automáticamente después de 14 días');
            console.log('═══════════════════════════════════════════════════════');
          } else {
            console.error('❌ No se encontró el profesor con email:', metadata.base44_user_email);
          }
        } catch (error) {
          console.error('❌ Error actualizando profesor:', error);
        }
      }

      // Check if this is a booking payment
      if (metadata.bookingId) {
        console.log('Payment successful for booking:', metadata.bookingId);

      // Update existing booking or create new one
      let booking;
      if (metadata.bookingId) {
        // Get booking to get teacher info
        const existingBooking = await base44.asServiceRole.entities.Booking.filter({ id: metadata.bookingId });
        const bookingData = existingBooking[0];

        // Update existing booking
        booking = await base44.asServiceRole.entities.Booking.update(metadata.bookingId, {
          payment_status: 'paid',
          payment_method: 'stripe',
          stripe_payment_id: session.payment_intent
        });

        // Notify teacher about payment
        await base44.asServiceRole.entities.Notification.create({
          user_id: bookingData.teacher_id,
          user_email: bookingData.teacher_email,
          type: 'booking_new',
          title: 'Pago recibido',
          message: `${bookingData.student_name} ha pagado la clase de ${bookingData.subject_name} del ${bookingData.date}`,
          related_id: metadata.bookingId,
          link_page: 'TeacherCalendar'
        });

        // Send push notification to teacher
        try {
          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            userEmail: bookingData.teacher_email,
            title: 'Pago recibido',
            body: `${bookingData.student_name} ha pagado la clase`,
            data: {
              booking_id: metadata.bookingId,
              page: 'TeacherCalendar'
            }
          });
        } catch (pushError) {
          console.error('Error enviando push notification:', pushError);
        }
      } else {
        // Create new booking (for backward compatibility)
        booking = await base44.asServiceRole.entities.Booking.create({
        student_id: metadata.student_id,
        student_name: metadata.student_name,
        student_email: metadata.student_email,
        teacher_id: metadata.teacher_id,
        teacher_name: metadata.teacher_name,
        teacher_email: metadata.teacher_email,
        subject_id: metadata.subject_id,
        subject_name: metadata.subject_name,
        date: metadata.date,
        start_time: metadata.start_time,
        end_time: metadata.end_time,
        duration_minutes: parseInt(metadata.duration_minutes),
        price: parseFloat(metadata.price),
        status: 'scheduled',
        payment_status: 'paid',
        payment_method: 'stripe',
        stripe_payment_id: session.payment_intent,
        files: []
        });
      }

      console.log('Booking updated/created:', booking.id);

      // Create notifications
      await base44.asServiceRole.entities.Notification.create({
        user_id: metadata.student_id,
        user_email: metadata.student_email,
        type: 'booking_new',
        title: 'Clase reservada y pagada',
        message: `Has reservado y pagado una clase de ${metadata.subject_name} con ${metadata.teacher_name} para el ${metadata.date} a las ${metadata.start_time}`,
        related_id: booking.id,
        link_page: 'MyClasses'
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: metadata.teacher_id,
        user_email: metadata.teacher_email,
        type: 'booking_new',
        title: 'Nueva reserva de clase',
        message: `${metadata.student_name} ha reservado y pagado una clase de ${metadata.subject_name} para el ${metadata.date} a las ${metadata.start_time}`,
        related_id: booking.id,
        link_page: 'TeacherCalendar'
      });

      console.log('Notifications created');
      }
    }

    // Handle subscription created - fallback to save Stripe IDs if checkout webhook missed them
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object;
      const userEmail = subscription.metadata?.base44_user_email;

      console.log('🔵 Stripe Webhook - customer.subscription.created');
      console.log('Subscription ID:', subscription.id);
      console.log('Customer:', subscription.customer);
      console.log('User email from metadata:', userEmail);

      if (userEmail) {
        try {
          const teachers = await base44.asServiceRole.entities.Teacher.filter({ user_email: userEmail });
          if (teachers.length > 0) {
            const teacher = teachers[0];
            // Solo actualizar si faltan los IDs de Stripe
            if (!teacher.stripe_subscription_id || !teacher.stripe_customer_id) {
              console.log('💾 Guardando IDs de Stripe en Teacher (fallback):', teacher.id);
              await base44.asServiceRole.entities.Teacher.update(teacher.id, {
                stripe_customer_id: subscription.customer,
                stripe_subscription_id: subscription.id,
              });
              console.log('✅ IDs de Stripe guardados correctamente');
            } else {
              console.log('ℹ️ Teacher ya tiene IDs de Stripe, no se actualiza');
            }
          } else {
            console.error('❌ No se encontró profesor con email:', userEmail);
          }
        } catch (err) {
          console.error('❌ Error en customer.subscription.created:', err.message);
        }
      }
    }

    // Handle successful subscription payment after trial
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔵 Stripe Webhook - invoice.payment_succeeded');
      console.log('💰 PAGO REALIZADO EXITOSAMENTE');
      console.log('Invoice ID:', invoice.id);
      console.log('Customer:', invoice.customer);
      console.log('Subscription:', invoice.subscription);
      console.log('Amount Paid:', invoice.amount_paid / 100, 'EUR');
      console.log('Billing Reason:', invoice.billing_reason);
      console.log('═══════════════════════════════════════════════════════');

      // Si es el primer pago después del trial
      if (invoice.billing_reason === 'subscription_cycle') {
        try {
          const teachers = await base44.asServiceRole.entities.Teacher.filter({
            stripe_subscription_id: invoice.subscription
          });

          if (teachers.length > 0) {
            const teacher = teachers[0];
            console.log('✅ Profesor encontrado:', teacher.id);
            console.log('✅ Email:', teacher.user_email);
            console.log('✅ Plan:', teacher.subscription_plan);
            console.log('✅ Monto cobrado:', invoice.amount_paid / 100, 'EUR');
            console.log('');
            console.log('🎉 FLAG DE VERIFICACIÓN: PAGO POST-TRIAL COMPLETADO');
            console.log('🎉 El profesor ha sido cobrado exitosamente después del período de prueba');
            console.log('═══════════════════════════════════════════════════════');

            // Enviar notificación al profesor
            await base44.asServiceRole.entities.Notification.create({
              user_id: teacher.id,
              user_email: teacher.user_email,
              type: 'booking_new',
              title: 'Pago de suscripción realizado',
              message: `Se ha procesado el pago de tu suscripción ${teacher.subscription_plan}. Monto: ${invoice.amount_paid / 100}€`,
              link_page: 'Profile'
            });
          }
        } catch (error) {
          console.error('❌ Error procesando pago de suscripción:', error);
        }
      }
    }

    // Handle subscription deleted/cancelled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔴 Stripe Webhook - customer.subscription.deleted');
      console.log('Subscription ID:', subscription.id);
      console.log('═══════════════════════════════════════════════════════');

      try {
        const teachers = await base44.asServiceRole.entities.Teacher.filter({
          stripe_subscription_id: subscription.id
        });

        if (teachers.length > 0) {
          const teacher = teachers[0];
          console.log('⚠️ Desactivando suscripción del profesor:', teacher.id);

          await base44.asServiceRole.entities.Teacher.update(teacher.id, {
            subscription_active: false,
            trial_active: false,
          });

          console.log('✅ Suscripción desactivada');
        }
      } catch (error) {
        console.error('❌ Error desactivando suscripción:', error);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});