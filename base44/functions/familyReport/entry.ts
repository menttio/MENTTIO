import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Informe mensual para la familia: qué clases ha dado el alumno, cómo ha ido cada una y
// qué toca ahora. Lo genera el profesor y decide si enviarlo; nada se manda solo.
// Si el alumno es menor de 14 años, se envía a su padre, madre o tutor.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function periodoPorDefecto() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function nombrePeriodo(period) {
  const [a, m] = String(period).split('-');
  const mes = MESES[Number(m) - 1] || '';
  return `${mes} de ${a}`;
}

function estrellas(n) {
  const valor = Math.round(Number(n) || 0);
  return '★'.repeat(valor) + '☆'.repeat(Math.max(0, 5 - valor));
}

function construirHtml(datos) {
  const p = 'margin:0 0 16px;font-size:16px;line-height:1.5;color:#404040;';
  const clasesHtml = datos.clases.length === 0
    ? `<p style="${p}">No hubo clases en este periodo.</p>`
    : datos.clases.map((c) => `<tr>
<td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#404040;">${escapeHtml(c.fecha)}</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#404040;">${escapeHtml(c.asignatura)}</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#41b08f;white-space:nowrap;">${c.valoracion ? estrellas(c.valoracion) : '—'}</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#555;">${escapeHtml(c.nota || '')}</td>
</tr>`).join('');

  const notas = datos.clases.filter((c) => c.nota).map((c) => `<li style="margin-bottom:8px;"><strong>${escapeHtml(c.fecha)}:</strong> ${escapeHtml(c.nota)}</li>`).join('');

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f2f2f2;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="background:#ffffff;border-radius:16px;padding:28px;">
<p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#41b08f;">Menπio</p>
<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:#404040;">Cómo ha ido ${escapeHtml(datos.periodoNombre)}</h1>
<p style="margin:0 0 20px;font-size:15px;color:#777;">Informe de <strong>${escapeHtml(datos.alumno)}</strong> · profesor: ${escapeHtml(datos.profesor)}</p>

<div style="display:block;background:#f7fdfb;border-radius:12px;padding:16px;margin-bottom:22px;">
<table style="width:100%;border-collapse:collapse;"><tr>
<td style="text-align:center;padding:6px;"><div style="font-size:26px;font-weight:bold;color:#404040;">${datos.totalClases}</div><div style="font-size:13px;color:#777;">clases</div></td>
<td style="text-align:center;padding:6px;"><div style="font-size:26px;font-weight:bold;color:#404040;">${datos.horas}</div><div style="font-size:13px;color:#777;">horas</div></td>
<td style="text-align:center;padding:6px;"><div style="font-size:26px;font-weight:bold;color:#404040;">${datos.media ? datos.media.toFixed(1) : '—'}</div><div style="font-size:13px;color:#777;">progreso medio</div></td>
</tr></table>
</div>

<h2 style="margin:0 0 10px;font-size:17px;color:#404040;">Clases del periodo</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
<tr style="background:#fafafa;">
<th style="text-align:left;padding:8px;font-size:13px;color:#777;">Fecha</th>
<th style="text-align:left;padding:8px;font-size:13px;color:#777;">Asignatura</th>
<th style="text-align:left;padding:8px;font-size:13px;color:#777;">Progreso</th>
<th style="text-align:left;padding:8px;font-size:13px;color:#777;">Comentario del profesor</th>
</tr>
${clasesHtml}
</table>

${notas ? `<h2 style="margin:0 0 10px;font-size:17px;color:#404040;">Lo que ha trabajado</h2><ul style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.5;color:#555;">${notas}</ul>` : ''}

${datos.proxima ? `<p style="${p}"><strong>Próxima clase:</strong> ${escapeHtml(datos.proxima)}</p>` : ''}
${datos.mensajeProfesor ? `<div style="background:#f7fdfb;border-left:4px solid #41f2c0;padding:14px 16px;border-radius:8px;margin-bottom:18px;"><p style="margin:0;font-size:15px;line-height:1.5;color:#404040;">${escapeHtml(datos.mensajeProfesor)}</p></div>` : ''}

<p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#777;">Si quieres comentar algo, responde a este correo y hablamos: ${escapeHtml(datos.contactoProfesor)}</p>
</div>
<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#999;text-align:center;">Recibes este informe porque ${escapeHtml(datos.alumno)} da clases con ${escapeHtml(datos.profesor)} a través de Menttio.</p>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const studentId = String(body.student_id || '');
    const period = String(body.period || periodoPorDefecto());
    const enviar = body.enviar === true;
    const mensajeProfesor = String(body.mensaje || '').trim().slice(0, 1000);

    if (!studentId) {
      return Response.json({ error: 'student_id es requerido' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const teachers = await db.entities.Teacher.filter({ user_email: user.email });
    const teacher = teachers[0];
    if (!teacher) {
      return Response.json({ error: 'Solo un profesor puede generar el informe' }, { status: 403 });
    }

    const student = await db.entities.Student.get(studentId).catch(() => null);
    if (!student) {
      return Response.json({ error: 'Alumno no encontrado' }, { status: 404 });
    }

    const todas = await db.entities.Booking.filter({ teacher_id: teacher.id, student_id: studentId }, '-date', 500);
    if (todas.length === 0) {
      return Response.json({ error: 'Este alumno no tiene clases contigo' }, { status: 403 });
    }

    const delPeriodo = todas
      .filter((b) => String(b.date || '').startsWith(period) && b.status === 'completed')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const clases = delPeriodo.map((b) => ({
      fecha: new Date(b.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      asignatura: b.subject_name || '',
      valoracion: b.progress_rating || null,
      nota: b.progress_note || ''
    }));

    const minutos = delPeriodo.reduce((t, b) => t + (Number(b.duration_minutes) || 60), 0);
    const valoradas = delPeriodo.filter((b) => Number(b.progress_rating) > 0);
    const media = valoradas.length > 0
      ? valoradas.reduce((t, b) => t + Number(b.progress_rating), 0) / valoradas.length
      : null;

    const hoy = new Date().toISOString().split('T')[0];
    const siguiente = todas
      .filter((b) => b.status === 'scheduled' && String(b.date) >= hoy)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

    const esMenor = student.is_minor === true;
    const destinatario = esMenor && student.guardian_email ? student.guardian_email : student.user_email;

    const datos = {
      alumno: student.full_name,
      profesor: teacher.full_name,
      contactoProfesor: teacher.user_email,
      periodo: period,
      periodoNombre: nombrePeriodo(period),
      totalClases: delPeriodo.length,
      horas: Math.round((minutos / 60) * 10) / 10,
      media,
      clases,
      sinNota: clases.filter((c) => !c.nota).length,
      proxima: siguiente ? `${new Date(siguiente.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${siguiente.start_time}` : '',
      mensajeProfesor,
      destinatario,
      destinatarioEsTutor: esMenor && Boolean(student.guardian_email),
      guardianName: student.guardian_name || ''
    };

    const html = construirHtml(datos);

    if (!enviar) {
      return Response.json({ preview: true, datos, html });
    }

    if (!destinatario) {
      return Response.json({ error: 'El alumno no tiene un correo de contacto' }, { status: 400 });
    }

    await db.integrations.Core.SendEmail({
      to: destinatario,
      subject: `Informe de ${student.full_name} — ${nombrePeriodo(period)}`,
      body: html,
      from_name: `${teacher.full_name} (Menttio)`
    });

    const registro = await db.entities.FamilyReport.create({
      student_id: student.id,
      student_name: student.full_name,
      teacher_id: teacher.id,
      teacher_name: teacher.full_name,
      period,
      sent_to: destinatario,
      sent_date: new Date().toISOString(),
      classes_count: delPeriodo.length,
      hours: datos.horas,
      average_rating: media || 0
    });

    return Response.json({ enviado: true, destinatario, id: registro.id, datos });
  } catch (error) {
    console.error('Error en familyReport:', error);
    return Response.json({ error: 'No se ha podido generar el informe' }, { status: 500 });
  }
});
