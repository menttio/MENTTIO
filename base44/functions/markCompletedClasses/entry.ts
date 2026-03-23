import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    
    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    
    // Get all scheduled bookings
    const scheduledBookings = await base44.asServiceRole.entities.Booking.filter({ 
      status: 'scheduled' 
    });

    let updatedCount = 0;

    for (const booking of scheduledBookings) {
      // Parse booking date and time
      const bookingDateTime = new Date(`${booking.date}T${booking.end_time}`);
      
      // If the class has ended, mark it as completed
      if (bookingDateTime < now) {
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          status: 'completed'
        });
        updatedCount++;

        // If payment is pending, notify the student
        if (booking.payment_status === 'pending') {
          await base44.asServiceRole.entities.Notification.create({
            user_id: booking.student_id,
            user_email: booking.student_email,
            type: 'booking_new',
            title: 'Clase completada - Pago pendiente',
            message: `Tu clase de ${booking.subject_name} con ${booking.teacher_name} ha finalizado. Por favor, procede con el pago.`,
            related_id: booking.id,
            link_page: 'MyClasses'
          });

          // Send push notification
          try {
            await base44.asServiceRole.functions.invoke('sendPushNotification', {
              userEmail: booking.student_email,
              title: 'Clase completada',
              body: 'Recuerda pagar tu clase',
              data: {
                booking_id: booking.id,
                page: 'MyClasses'
              }
            });
          } catch (pushError) {
            console.error('Error enviando push notification:', pushError);
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `${updatedCount} clases marcadas como completadas` 
    });
  } catch (error) {
    console.error('Error marking completed classes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});