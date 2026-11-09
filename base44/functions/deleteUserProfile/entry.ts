import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get event data from payload
    const { event, data } = await req.json();
    
    if (event.type !== 'delete') {
      return Response.json({ message: 'Not a delete event' });
    }

    const userEmail = event.entity_id; // The deleted user's email or ID

    // SEGURIDAD (09/11/2026): esta funcion no comprobaba quien la llamaba, asi que cualquiera
    // podia borrar la ficha de profesor o alumno de otra persona sabiendo su correo. Su unico
    // uso legitimo es limpiar los perfiles de un usuario que YA se ha borrado. Por eso solo
    // actua si no queda ningun usuario con ese correo o id.
    if (!userEmail) {
      return Response.json({ error: 'entity_id requerido' }, { status: 400 });
    }
    const sigueExistiendo = await base44.asServiceRole.entities.User.filter({ email: String(userEmail).toLowerCase() }).catch(() => null);
    const sigueExistiendoPorId = await base44.asServiceRole.entities.User.get(String(userEmail)).catch(() => null);
    if (sigueExistiendo === null || (sigueExistiendo && sigueExistiendo.length > 0) || sigueExistiendoPorId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Try to find and delete Teacher profile
    const teachers = await base44.asServiceRole.entities.Teacher.filter({ 
      user_email: userEmail 
    });
    
    if (teachers.length > 0) {
      for (const teacher of teachers) {
        await base44.asServiceRole.entities.Teacher.delete(teacher.id);
        console.log(`Deleted teacher profile for ${userEmail}`);
      }
    }
    
    // Try to find and delete Student profile
    const students = await base44.asServiceRole.entities.Student.filter({ 
      user_email: userEmail 
    });
    
    if (students.length > 0) {
      for (const student of students) {
        await base44.asServiceRole.entities.Student.delete(student.id);
        console.log(`Deleted student profile for ${userEmail}`);
      }
    }

    return Response.json({ 
      success: true,
      message: `Profiles deleted for ${userEmail}`
    });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
