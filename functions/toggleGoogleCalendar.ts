import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connect } = await req.json();

    // Check if user is teacher or student
    const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
    const students = await base44.entities.Student.filter({ user_email: user.email });

    if (teachers.length > 0) {
      await base44.entities.Teacher.update(teachers[0].id, {
        google_calendar_connected: connect
      });
    } else if (students.length > 0) {
      await base44.entities.Student.update(students[0].id, {
        google_calendar_connected: connect
      });
    }

    return Response.json({ success: true, connected: connect });

  } catch (error) {
    console.error('Error toggling Google Calendar:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});