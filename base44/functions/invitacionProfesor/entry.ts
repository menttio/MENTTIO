import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Datos mínimos de un profesor para pintar su invitación, SIN pedir sesión.
//
// Hace falta que sea público porque el alumno abre el enlace antes de tener cuenta: si no
// puede ver quién le invita, la página le pide registrarse "en algo" sin decirle en qué, y
// ahí se cae la mitad de la gente. teachersDirectory no vale: exige sesión y devuelve la
// ficha entera de todos los profesores.
//
// Se devuelve solo el nombre y qué asignaturas da, que es lo que el alumno necesita para
// reconocer a su profesor y elegir materia. Ni correo, ni teléfono, ni nada de Stripe o
// Calendar. Y hay que conocer el identificador para preguntar: no se puede listar.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const teacherId = String(body.teacher_id || '').trim();
    if (!teacherId) {
      return Response.json({ error: 'teacher_id es requerido' }, { status: 400 });
    }

    const teacher = await db.entities.Teacher.get(teacherId).catch(() => null);
    if (!teacher) {
      return Response.json({ error: 'Esta invitación no es válida' }, { status: 404 });
    }

    const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];

    return Response.json({
      teacher: {
        id: teacher.id,
        full_name: teacher.full_name || 'Tu profesor',
        subjects: subjects.map((s) => ({
          subject_id: s.subject_id ?? null,
          subject_name: s.subject_name || '',
          level: s.level || '',
          price_per_hour: s.price_per_hour ?? null,
        })),
      },
    });
  } catch (error) {
    console.error('Error en invitacionProfesor:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
});
