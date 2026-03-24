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
      
      // Cancel Stripe subscription if exists
      console.log('═══ STRIPE CANCELLATION ═══');
      console.log('stripe_subscription_id:', teacherData.stripe_subscription_id || 'NOT SET');
      console.log('stripe_customer_id:', teacherData.stripe_customer_id || 'NOT SET');
      console.log('teacher email:', teacherData.user_email);

      // Collect customer IDs to search for subscriptions
      const customerIdsToCheck = new Set();

      if (teacherData.stripe_customer_id) {
        customerIdsToCheck.add(teacherData.stripe_customer_id);
      }

      // Always search by email in Stripe to catch cases where IDs weren't saved
      try {
        const customersByEmail = await stripe.customers.list({ email: teacherData.user_email, limit: 10 });
        console.log(`Found ${customersByEmail.data.length} Stripe customer(s) by email`);
        for (const c of customersByEmail.data) {
          customerIdsToCheck.add(c.id);
        }
      } catch (err) {
        console.error('Error searching customers by email:', err.message);
      }

      console.log('Customer IDs to check:', [...customerIdsToCheck]);

      // Cancel by subscription ID if we have it
      if (teacherData.stripe_subscription_id) {
        try {
          const cancelled = await stripe.subscriptions.cancel(teacherData.stripe_subscription_id);
          console.log(`✅ Cancelled subscription by ID: ${teacherData.stripe_subscription_id}, status: ${cancelled.status}`);
        } catch (stripeError) {
          console.error('❌ Error cancelling by subscription ID:', stripeError.message);
        }
      }

      // Also cancel all subscriptions found via customer IDs
      for (const customerId of customerIdsToCheck) {
        try {
          for (const status of ['active', 'trialing']) {
            const subs = await stripe.subscriptions.list({ customer: customerId, status });
            console.log(`Customer ${customerId} - ${status} subscriptions: ${subs.data.length}`);
            for (const sub of subs.data) {
              if (sub.id === teacherData.stripe_subscription_id) continue; // already cancelled above
              await stripe.subscriptions.cancel(sub.id);
              console.log(`✅ Cancelled ${status} subscription: ${sub.id}`);
            }
          }
        } catch (stripeError) {
          console.error(`❌ Error cancelling subscriptions for customer ${customerId}:`, stripeError.message);
        }
      }

      if (customerIdsToCheck.size === 0 && !teacherData.stripe_subscription_id) {
        console.log('⚠️ No Stripe customer found for this teacher');
      }
      console.log('═══ END STRIPE CANCELLATION ═══');

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