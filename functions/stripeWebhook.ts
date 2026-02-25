import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

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

    // Handle checkout completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('Payment successful for booking:', metadata.bookingId);

      // Check if this is a subscription payment (new teacher)
      if (metadata.type === 'subscription' && metadata.teacher_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: 'Nuevo profesor suscrito',
            body: `
              <h2>Nuevo profesor se ha suscrito</h2>
              <p><strong>Nombre:</strong> ${metadata.teacher_name || 'No especificado'}</p>
              <p><strong>Email:</strong> ${metadata.teacher_email}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
              <p><strong>Monto:</strong> ${session.amount_total / 100}€</p>
            `
          });
          console.log('Correo de nueva suscripción enviado a menttio@menttio.com');
        } catch (emailError) {
          console.error('Error enviando correo de suscripción:', emailError);
        }
      }

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

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});