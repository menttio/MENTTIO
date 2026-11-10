import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lote F (10/11/2026): el chat pasa por el servidor.
//
// Antes cualquiera podia crear una conversacion poniendo el correo de cualquier alumno (un
// "profesor" recien registrado podia escribir a un menor que no conocia) y las dos partes podian
// editar la conversacion y los mensajes del otro (cambiar el correo del alumno, reescribir
// mensajes). Ahora las reglas de Conversation y Message solo dejan escribir al servidor.
//
// Acciones:
//   iniciar  {teacher_id} (alumno) | {student_id} (profesor, solo alumnos con los que tiene relacion)
//   mensaje  {conversation_id, content}
//   leido    {conversation_id}

const err = (error: string, status = 400) => Response.json({ error }, { status });
const lower = (s: unknown) => String(s ?? '').trim().toLowerCase();
const lista = (x: unknown): any[] => (Array.isArray(x) ? x : []);

function rolEn(c: any, yo: string): 'student' | 'teacher' | null {
  if (lower(c?.student_email) === yo) return 'student';
  if (lower(c?.teacher_email) === yo) return 'teacher';
  return null;
}

// Mismo criterio que studentsOfTeacher, salvo las conversaciones (que es justo lo que se crea).
async function tieneRelacion(db: any, teacherId: string, student: any) {
  if (lista(student?.assigned_teachers).some((a) => String(a?.teacher_id) === String(teacherId))) return true;
  const previas = await db.entities.Booking.filter({ teacher_id: teacherId }, '-date', 1000).catch(() => []);
  return previas.some((b: any) => String(b.student_id) === String(student.id)
    || lista(b.enrolled_students).some((s) => String(s?.student_id) === String(student.id)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return err('Tienes que iniciar sesion', 401);
    const yo = lower(user.email);
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole;
    const accion = String(body.accion || '');

    if (accion === 'iniciar') {
      let teacher: any = null;
      let student: any = null;
      if (body.teacher_id) {
        // Un alumno escribe a un profesor (los profesores son adultos y se anuncian en Menttio).
        student = (await db.entities.Student.filter({ user_email: user.email }).catch(() => []))[0];
        teacher = await db.entities.Teacher.get(String(body.teacher_id)).catch(() => null);
        if (!student) return err('No tienes ficha de alumno', 403);
        if (!teacher) return err('Profesor no encontrado', 404);
      } else if (body.student_id) {
        // Un profesor solo puede abrir chat con sus alumnos.
        teacher = (await db.entities.Teacher.filter({ user_email: user.email }).catch(() => []))[0];
        student = await db.entities.Student.get(String(body.student_id)).catch(() => null);
        if (!teacher) return err('No tienes ficha de profesor', 403);
        if (!student) return err('Alumno no encontrado', 404);
        if (user.role !== 'admin' && !(await tieneRelacion(db, teacher.id, student))) {
          return err('Solo puedes escribir a tus alumnos', 403);
        }
      } else {
        return err('Falta el contacto');
      }
      const existentes = await db.entities.Conversation.filter({ student_id: student.id, teacher_id: teacher.id }).catch(() => []);
      if (existentes[0]) return Response.json({ conversation: existentes[0], ya_existia: true });
      const conversation = await db.entities.Conversation.create({
        student_id: student.id,
        student_name: student.full_name || '',
        student_email: student.user_email,
        teacher_id: teacher.id,
        teacher_name: teacher.full_name || '',
        teacher_email: teacher.user_email,
        unread_count_student: 0,
        unread_count_teacher: 0,
      });
      return Response.json({ conversation });
    }

    const c = await db.entities.Conversation.get(String(body.conversation_id || '')).catch(() => null);
    if (!c) return err('Conversacion no encontrada', 404);
    const rol = rolEn(c, yo);
    if (!rol) return err('Esta conversacion no es tuya', 403);
    const otroNoLeidos = rol === 'student' ? 'unread_count_teacher' : 'unread_count_student';
    const misNoLeidos = rol === 'student' ? 'unread_count_student' : 'unread_count_teacher';

    if (accion === 'mensaje') {
      const content = String(body.content ?? '').trim().slice(0, 5000);
      if (!content) return err('El mensaje esta vacio');
      const message = await db.entities.Message.create({
        conversation_id: c.id,
        student_email: c.student_email,
        teacher_email: c.teacher_email,
        sender_type: rol,
        sender_id: rol === 'student' ? c.student_id : c.teacher_id,
        sender_name: rol === 'student' ? c.student_name : c.teacher_name,
        content,
        is_read: false,
      });
      await db.entities.Conversation.update(c.id, {
        last_message: content.slice(0, 500),
        last_message_date: new Date().toISOString(),
        last_message_by: rol,
        [otroNoLeidos]: (Number(c[otroNoLeidos]) || 0) + 1,
      });
      return Response.json({ message });
    }

    if (accion === 'leido') {
      const mensajes = await db.entities.Message.filter({ conversation_id: c.id }).catch(() => []);
      const pendientes = mensajes.filter((m: any) => !m.is_read && m.sender_type !== rol);
      for (const m of pendientes) await db.entities.Message.update(m.id, { is_read: true });
      if (pendientes.length || Number(c[misNoLeidos])) await db.entities.Conversation.update(c.id, { [misNoLeidos]: 0 });
      return Response.json({ leidos: pendientes.length });
    }

    return err('Accion no valida');
  } catch (e) {
    console.error('chatActions:', (e as Error)?.message);
    return err('Error interno', 500);
  }
});
