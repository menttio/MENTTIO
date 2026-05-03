import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS and fetch all teachers
    const teachers = await base44.asServiceRole.entities.Teacher.list();

    return Response.json({ teachers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});