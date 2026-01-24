import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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