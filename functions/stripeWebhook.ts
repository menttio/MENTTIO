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

      // Update existing booking or create new one
      let booking;
      if (metadata.bookingId) {
        // Update existing booking
        booking = await base44.asServiceRole.entities.Booking.update(metadata.bookingId, {
          payment_status: 'paid',
          payment_method: 'stripe',
          stripe_payment_id: session.payment_intent
        });
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