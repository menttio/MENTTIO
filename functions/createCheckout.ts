import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      teacherId, 
      teacherName,
      teacherEmail,
      subjectId, 
      subjectName, 
      date, 
      startTime, 
      endTime,
      duration,
      price 
    } = await req.json();

    // Get student info
    const students = await base44.entities.Student.filter({ user_email: user.email });
    if (students.length === 0) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }
    const student = students[0];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Clase de ${subjectName}`,
              description: `Con ${teacherName} - ${date} a las ${startTime}`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/book-class`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        student_id: student.id,
        student_name: student.full_name,
        student_email: user.email,
        teacher_id: teacherId,
        teacher_name: teacherName,
        teacher_email: teacherEmail,
        subject_id: subjectId,
        subject_name: subjectName,
        date: date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration.toString(),
        price: price.toString()
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});