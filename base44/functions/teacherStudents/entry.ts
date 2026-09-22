import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Antes, el panel del profesor hacía Student.list(): cualquier usuario registrado podía
// descargarse TODOS los alumnos. Ahora el profesor solo ve a los alumnos con los que ya
// tiene relación (clases, conversaciones o asignación), y puede buscar a uno por email exacto.
function publicStudent(student) {
  return {
    id: student.id,
    full_name: student.full_name,
    user_email: student.user_email,
    phone: student.phone,
    profile_photo: student.profile_photo,
    assigned_teachers: student.assigned_teachers || []
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = base44.asServiceRole;
    const email = (user.email || '').toLowerCase();
    const body = await req.json().catch(() => ({}));

    const teachers = await db.entities.Teacher.filter({ user_email: user.email });
    const teacher = teachers[0] || null;
    if (!teacher) {
      return Response.json({ error: 'Solo los profesores pueden consultar sus alumnos' }, { status: 403 });
    }

    // Búsqueda puntual por email exacto (para dar de alta a un alumno nuevo en una clase).
    if (body.email) {
      const found = await db.entities.Student.filter({ user_email: String(body.email).trim().toLowerCase() });
      return Response.json({ students: found.map(publicStudent) });
    }

    const [bookings, conversations, allStudents] = await Promise.all([
      db.entities.Booking.filter({ teacher_id: teacher.id }, '-date', 1000),
      db.entities.Conversation.filter({ teacher_id: teacher.id }, '-created_date', 500),
      db.entities.Student.list('-created_date', 1000)
    ]);

    const ids = new Set();
    for (const b of bookings) {
      if (b.student_id) ids.add(String(b.student_id));
      for (const s of b.enrolled_students || []) if (s.student_id) ids.add(String(s.student_id));
    }
    for (const c of conversations) if (c.student_id) ids.add(String(c.student_id));

    const students = allStudents.filter((s) => {
      if (ids.has(String(s.id))) return true;
      const assigned = Array.isArray(s.assigned_teachers) ? s.assigned_teachers : [];
      return assigned.some((a) => String(a.teacher_id) === String(teacher.id));
    });

    return Response.json({ students: students.map(publicStudent), teacher_id: teacher.id, requested_by: email });
  } catch (error) {
    console.error('Error en teacherStudents:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
