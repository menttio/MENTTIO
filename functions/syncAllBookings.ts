import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all scheduled bookings
    const scheduledBookings = await base44.asServiceRole.entities.Booking.filter({ 
      status: 'scheduled' 
    });

    // Get cancelled bookings to clean up from calendar
    const cancelledBookings = await base44.asServiceRole.entities.Booking.filter({ 
      status: 'cancelled' 
    });

    console.log(`Found ${scheduledBookings.length} scheduled bookings to sync and ${cancelledBookings.length} cancelled to clean`);

    const results = {
      total_scheduled: scheduledBookings.length,
      total_cancelled: cancelledBookings.length,
      synced_teacher: 0,
      synced_student: 0,
      deleted_teacher: 0,
      deleted_student: 0,
      errors: []
    };

    // Sync scheduled bookings
    for (const booking of scheduledBookings) {
      try {
        // Get teacher and student info
        const teachers = await base44.asServiceRole.entities.Teacher.filter({ 
          user_email: booking.teacher_email 
        });
        const students = await base44.asServiceRole.entities.Student.filter({ 
          user_email: booking.student_email 
        });

        // Sync for teacher
        if (teachers.length > 0 && teachers[0].google_calendar_connected) {
          try {
            const response = await base44.asServiceRole.functions.invoke('syncGoogleCalendar', {
              bookingId: booking.id,
              userType: 'teacher',
              userEmail: booking.teacher_email
            });
            
            if (response.data?.success) {
              results.synced_teacher++;
            }
          } catch (error) {
            console.error(`Error syncing booking ${booking.id} for teacher:`, error);
            results.errors.push({
              booking_id: booking.id,
              user: 'teacher',
              error: error.message
            });
          }
        }

        // Sync for student
        if (students.length > 0 && students[0].google_calendar_connected) {
          try {
            const response = await base44.asServiceRole.functions.invoke('syncGoogleCalendar', {
              bookingId: booking.id,
              userType: 'student',
              userEmail: booking.student_email
            });
            
            if (response.data?.success) {
              results.synced_student++;
            }
          } catch (error) {
            console.error(`Error syncing booking ${booking.id} for student:`, error);
            results.errors.push({
              booking_id: booking.id,
              user: 'student',
              error: error.message
            });
          }
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        results.errors.push({
          booking_id: booking.id,
          error: error.message
        });
      }
    }

    // Clean up cancelled bookings from Google Calendar
    for (const booking of cancelledBookings) {
      try {
        const teachers = await base44.asServiceRole.entities.Teacher.filter({ 
          user_email: booking.teacher_email 
        });
        const students = await base44.asServiceRole.entities.Student.filter({ 
          user_email: booking.student_email 
        });

        // Delete for teacher
        if (teachers.length > 0 && teachers[0].google_calendar_connected && booking.google_event_id_teacher) {
          try {
            const response = await base44.asServiceRole.functions.invoke('deleteGoogleCalendarEvent', {
              bookingId: booking.id,
              userType: 'teacher',
              userEmail: booking.teacher_email
            });
            
            if (response.data?.success) {
              results.deleted_teacher++;
            }
          } catch (error) {
            console.error(`Error deleting booking ${booking.id} for teacher:`, error);
          }
        }

        // Delete for student
        if (students.length > 0 && students[0].google_calendar_connected && booking.google_event_id_student) {
          try {
            const response = await base44.asServiceRole.functions.invoke('deleteGoogleCalendarEvent', {
              bookingId: booking.id,
              userType: 'student',
              userEmail: booking.student_email
            });
            
            if (response.data?.success) {
              results.deleted_student++;
            }
          } catch (error) {
            console.error(`Error deleting booking ${booking.id} for student:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing cancelled booking ${booking.id}:`, error);
      }
    }

    console.log('Sync results:', results);

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in syncAllBookings:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});