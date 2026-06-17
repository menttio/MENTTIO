import { escapeHtml } from "./lib/util";

const LOGO_DARK = "https://drive.google.com/uc?id=1o4gjhUnaWDXeIlo7U5NsTWhRxT5Su6Eb";
const LOGO_LIGHT = "https://drive.google.com/uc?id=1XmGwzehuwGD1PVdMVgtOPruvKzzrODrL";
const LINK = "https://www.menttio.com";

const footer = `
  <hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
  <p style="font-size:12px; color:#888; text-align:center;">
    Este correo ha sido enviado automáticamente por <strong>Menttio</strong>.<br>
    Por favor, no respondas directamente a este mensaje.
  </p>`;

export interface Email {
  subject: string;
  html: string;
}

// Aviso interno de nuevo alumno/profesor (Workflows "Aviso nuevo alumno/profesor").
export function avisoNuevoRegistro(
  tipo: "alumno" | "profesor",
  d: { nombre: string; apellidos: string; telefono: string; email: string },
): Email {
  const titulo = tipo === "profesor" ? "¡Se ha registrado un nuevo profesor! 🎉" : "¡Se ha registrado un nuevo alumno! 🎉";
  return {
    subject: tipo === "profesor" ? "👨‍🏫 Nuevo profesor registrado en Menttio" : "🎓 Nuevo alumno registrado en Menttio",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background:#333038; border-radius:10px; padding:25px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08); color:white;">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_DARK}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">${titulo}</h2>
    <p style="text-align:center; color:#f1f1f1;">Te compartimos los datos para que los tengas a mano 👇</p>
    <div style="background:#ffffff; padding:20px; margin:25px auto; border-radius:10px; max-width:420px; color:#333;">
      <p style="margin:0 0 12px 0;"><strong style="color:#0b72b9;">Nombre:</strong> ${escapeHtml(d.nombre)}</p>
      <p style="margin:0 0 12px 0;"><strong style="color:#0b72b9;">Apellidos:</strong> ${escapeHtml(d.apellidos)}</p>
      <p style="margin:0 0 12px 0;"><strong style="color:#0b72b9;">Teléfono:</strong> ${escapeHtml(d.telefono)}</p>
      <p style="margin:0;"><strong style="color:#0b72b9;">Correo electrónico:</strong> ${escapeHtml(d.email)}</p>
    </div>
    <p style="text-align:center; margin-top:50px; color:#f1f1f1;">Seguimos 🚀<br><strong>El equipo de Menttio</strong></p>
    ${footer}
  </div>
</body></html>`,
  };
}

// Email al PROFESOR cuando un alumno reserva (Workflow "Reserva realizada", nodos "Aviso alumno").
export function reservaProfesor(d: {
  nombreAlumno: string;
  apellidosAlumno: string;
  asignatura: string;
  fecha: string;
  hora: string;
}): Email {
  return {
    subject: "📅 Nueva reserva de clase",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background:#333038; border-radius:10px; padding:25px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08); color:white;">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_DARK}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">Nueva reserva confirmada 📘</h2>
    <p style="text-align:center; margin-top:20px; line-height:1.6;">
      El alumno <strong>${escapeHtml(d.nombreAlumno)} ${escapeHtml(d.apellidosAlumno)}</strong> ha realizado una nueva reserva
      para una clase de <strong>${escapeHtml(d.asignatura)}</strong>.
    </p>
    <div style="margin:26px auto; background:#f0f7ff; border:1px solid #e0edf9; border-radius:10px; padding:18px; max-width:300px; color:#333038;">
      <p style="margin:0; text-align:center; font-size:15px;">📅 <strong>Fecha:</strong> ${escapeHtml(d.fecha)}<br><br>⏰ <strong>Hora:</strong> ${escapeHtml(d.hora)}</p>
    </div>
    <p style="text-align:center; margin-top:26px;">Puedes revisar los detalles de la clase desde tu panel de profesor.</p>
    <p style="text-align:center; margin-top:40px;">Un saludo,<br><strong>El equipo de Menttio</strong> 😊</p>
    ${footer}
  </div>
</body></html>`,
  };
}

// Imágenes del email premium (instrucciones para activar la grabación en Meet).
const VC_IMG1 = "https://drive.google.com/uc?id=1RA_WXv1VSMewnmKDStySdZD3Dstf58RF";
const VC_IMG2 = "https://drive.google.com/uc?id=1h3CtFp0JHpyXJPcNXXd2C2LnNXEWH8Wd";

// Email "tu clase está a punto de comenzar" con el enlace de la videollamada
// (Workflow "Creacion videollamada", nodos Code/Code1/Code7). avisoGrabar=true => versión premium.
export function videollamadaAviso(d: { link: string; avisoGrabar: boolean }): Email {
  const bloqueGrabar = d.avisoGrabar
    ? `
    <div style="background:#fff3cd; border-left:6px solid #ffb300; padding:15px; margin:25px auto; border-radius:6px; max-width:300px;">
      <p style="margin:0; color:#8a6d3b; font-weight:bold; text-align:center;">⚠️ Recuerda grabar la clase.</p>
    </div>
    <img src="${VC_IMG1}" alt="Habilitar grabación 1" style="max-width:400px; border-radius:10px; display:block; margin:0 auto 50px auto;"/>
    <img src="${VC_IMG2}" alt="Habilitar grabación 2" style="max-width:400px; border-radius:10px; display:block; margin:0 auto 40px auto;"/>`
    : "";
  return {
    subject: "📚 Tu clase está a punto de comenzar",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background:#333038; border-radius:10px; padding:25px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08); color:white;">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_DARK}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">Tu clase está a punto de comenzar 🎓</h2>
    <p style="text-align:center;">Entra en este enlace para unirte:</p>
    <div style="text-align:center; margin: 25px 0;">
      <a href="${escapeHtml(d.link)}" style="display:inline-block; background:#0b72b9; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">Entrar a la videollamada</a>
    </div>
    ${bloqueGrabar}
    <p style="text-align:center; margin-top:50px;">Nos vemos en clase 👋<br><strong>El equipo de Menttio</strong></p>
    ${footer}
  </div>
</body></html>`,
  };
}

// Aviso interno de nueva reserva (nodo "Aviso alumno1" -> menttio@menttio.com).
export function reservaInterna(d: {
  nombreAlumno: string;
  apellidosAlumno: string;
  asignatura: string;
  nombreProfesor: string;
  fecha: string;
}): Email {
  return {
    subject: "Nueva reserva 😊",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background:#333038; border-radius:10px; padding:25px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08); color:white;">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_DARK}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">Nueva reserva realizada 📘</h2>
    <div style="margin:26px auto; background:#f0f7ff; border:1px solid #e0edf9; border-radius:10px; padding:18px; max-width:340px; color:#333038;">
      <p style="margin:0; text-align:center; font-size:15px; line-height:2;">
        👤 <strong>Alumno:</strong> ${escapeHtml(d.nombreAlumno)} ${escapeHtml(d.apellidosAlumno)}<br>
        📚 <strong>Asignatura:</strong> ${escapeHtml(d.asignatura)}<br>
        🧑‍🏫 <strong>Profesor:</strong> ${escapeHtml(d.nombreProfesor)}<br>
        📅 <strong>Fecha:</strong> ${escapeHtml(d.fecha)}
      </p>
    </div>
    ${footer}
  </div>
</body></html>`,
  };
}

// Credenciales enviadas al correo PERSONAL del profesor (Registrar profesor, "Code in JavaScript3").
export function credencialesPersonal(d: { correoElectronico: string; contrasena: string }): Email {
  return {
    subject: "✅ Tu perfil de profesor ya está creado | Menttio",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background:#333038; border-radius:10px; padding:25px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.08); color:white;">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_DARK}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">¡Tu perfil ya ha sido creado! ✅</h2>
    <p style="text-align:center; color:#f1f1f1;">A continuación tienes tus datos de acceso 👇</p>
    <div style="text-align:center; margin:25px 0;">
      <div style="background:#ffffff; padding:20px 30px; border-radius:10px; color:#333; display:inline-block; text-align:center;">
        <p style="margin:0 0 14px 0; font-weight:bold; color:#0b72b9;">Datos de acceso</p>
        <p style="margin:0 0 12px 0;"><strong style="color:#0b72b9;">Correo electrónico:</strong> ${escapeHtml(d.correoElectronico)}</p>
        <p style="margin:0;"><strong style="color:#0b72b9;">Contraseña:</strong> ${escapeHtml(d.contrasena)}</p>
      </div>
    </div>
    <p style="text-align:center; color:#f1f1f1; margin:20px 0 10px 0;">Con este correo deberás acceder a la plataforma <strong>Menttio</strong> para entrar al <strong>dashboard de profesor</strong>.</p>
    <div style="text-align:center; margin: 25px 0 10px 0;">
      <a href="${LINK}" style="display:inline-block; background:#0b72b9; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">Acceder a Menttio</a>
    </div>
    <div style="background:#fff3cd; border-left:6px solid #ffb300; padding:15px; margin:25px auto; border-radius:6px; max-width:420px;">
      <p style="margin:0; color:#8a6d3b; font-weight:bold; text-align:center;">🔐 Importante: A este correo llegarán las reservas realizadas por tus alumnos. Podrás cambiar la contraseña una vez inicies sesión en Gmail con la cuenta nueva creada.</p>
    </div>
    <p style="text-align:center; margin-top:40px; color:#f1f1f1;">¡Bienvenido/a a Menttio! 👋<br><strong>El equipo de Menttio</strong></p>
    ${footer}
  </div>
</body></html>`,
  };
}

// Credenciales enviadas al correo CORPORATIVO recién creado (Registrar profesor, "Code in JavaScript4").
export function credencialesCorporativo(d: {
  nombre: string;
  emailCorporativo: string;
  password: string;
}): Email {
  return {
    subject: "✅ Tu cuenta de profesor ya está creada | Menttio",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background: #ffffff; border-radius: 10px; padding: 25px; max-width: 600px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_LIGHT}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center;">¡Tu cuenta de profesor ya está creada! ✅</h2>
    <p style="text-align:center;">Hola <strong>${escapeHtml(d.nombre)}</strong>, tu cuenta de profesor ha sido creada correctamente.</p>
    <div style="margin-top:18px; background:#f0f7ff; border:1px solid #e0edf9; border-radius:10px; padding:18px;">
      <p style="margin:0; text-align:center; font-weight:bold; color:#0b72b9;">Cuenta Corporativa de Google</p>
      <div style="margin-top:14px; background:#ffffff; border:1px solid #e6eef6; border-radius:10px; padding:14px;">
        <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(d.emailCorporativo)}</p>
        <p style="margin:0;"><strong>Contraseña temporal:</strong> ${escapeHtml(d.password)}</p>
      </div>
    </div>
    <div style="margin-top:22px; background:#fff7e6; border:1px solid #ffe1a3; border-radius:10px; padding:18px;">
      <p style="margin:0; font-weight:bold; color:#0b72b9; text-align:center;">⚠️ IMPORTANTE - Configura tu acceso a Menttio:</p>
      <div style="margin-top:14px; background:#ffffff; border:1px solid #ffe8b8; border-radius:10px; padding:14px;">
        <p style="margin:0 0 8px 0;">Recibirás un email de invitación de <strong>Base44</strong> (la plataforma de Menttio) en <strong>${escapeHtml(d.emailCorporativo)}</strong>.</p>
        <p style="margin:0 0 8px 0;">Haz clic en el enlace del email y establece tu contraseña para acceder a Menttio.</p>
        <p style="margin:0;"><strong>Recomendación:</strong> Usa la misma contraseña para mayor comodidad.</p>
      </div>
      <p style="text-align:center; margin:14px 0 0 0;">Después podrás iniciar sesión de dos formas:</p>
      <p style="text-align:center; margin:10px 0 0 0;">🔵 Con el botón <strong>"Iniciar sesión con Google"</strong> (usando tu cuenta corporativa)<br>📧 Con tu email corporativo y contraseña directamente</p>
    </div>
    <div style="text-align:center; margin: 22px 0 10px 0;">
      <a href="${LINK}" style="display:inline-block; background:#0b72b9; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">Acceder a Menttio</a>
    </div>
    <p style="text-align:center; margin-top:30px;">¡Bienvenido/a a Menttio! 👋<br><strong>El equipo de Menttio</strong></p>
    ${footer}
  </div>
</body></html>`,
  };
}

// Aviso al profesor de archivos subidos (Workflow "Subir archivos", "Code in JavaScript2").
export function archivosSubidos(d: {
  nombre: string;
  apellidos: string;
  asignatura: string;
  fecha: string;
  urls: string[];
}): Email {
  const buttons = d.urls.length
    ? `<div style="text-align:center; margin: 18px 0 6px 0;">${d.urls
        .map(
          (url, i) =>
            `<a href="${escapeHtml(url)}" style="display:inline-block; background:#0b72b9; color:#ffffff; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:13px; margin:6px 0;">⬇️ Descargar archivo ${i + 1}</a><br>`,
        )
        .join("")}</div>`
    : `<p style="text-align:center; margin: 16px 0; color:#888;">(No se encontraron enlaces de descarga)</p>`;
  return {
    subject: "📎 Nuevos documentos del alumno",
    html: `
<html><body style="font-family: Arial, sans-serif; background-color: #f6f8fa; padding: 30px; color: #333;">
  <div style="background: #ffffff; border-radius: 10px; padding: 25px; max-width: 600px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center; margin-bottom: 25px;"><img src="${LOGO_LIGHT}" alt="Menttio" style="max-width: 160px;"/></div>
    <h2 style="color:#0b72b9; text-align:center; margin: 0 0 12px 0;">Nuevos documentos disponibles</h2>
    <p style="margin:0 0 14px 0; line-height:1.6; text-align:center;">
      Tu alumno <strong>${escapeHtml(d.nombre)}</strong> <strong>${escapeHtml(d.apellidos)}</strong> ha subido documentos
      para la clase de <strong>${escapeHtml(d.asignatura)}</strong> del día <strong>${escapeHtml(d.fecha)}</strong>.<br><br>
      Accede a ellos desde la carpeta compartida de Drive
    </p>
    ${buttons}
    <p style="margin-top:26px; line-height:1.6; text-align:center;">Un saludo del equipo de <strong>Menttio</strong> 😊</p>
    ${footer}
  </div>
</body></html>`,
  };
}

// --- Informe mensual de progreso (Workflow "Informe mensual", "Generar HTML rico") ---
interface ClaseInforme {
  fecha: string;
  asignatura: string;
  precio: number;
  valoracion?: number;
  nota?: string | null;
  deberes?: boolean | null;
}
export interface InformeAlumno {
  nombre: string;
  email: string;
  profesor: string;
  mesLabel: string;
  totalPrecio: number | string;
  clases: ClaseInforme[];
}

export function informeMensual(d: InformeAlumno): Email {
  const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const tieneProgreso = d.clases.some((c) => (c.valoracion ?? 0) > 0 || c.nota || c.deberes !== null);

  const clasesRows = d.clases
    .map((c) => {
      const [y, m, day] = (c.fecha || "").split("-");
      const fechaStr = `${parseInt(day || "1")} de ${meses[parseInt(m || "1")]} de ${y}`;
      const estrellas = (c.valoracion ?? 0) > 0 ? "●".repeat(c.valoracion as number) + "○".repeat(5 - (c.valoracion as number)) : "";
      let debBadge = "";
      if (c.deberes === true) debBadge = '<span style="background:#e6f9f1;color:#1a8a4a;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">Deberes: si</span>';
      else if (c.deberes === false) debBadge = '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">Deberes: no</span>';
      const notaRow = c.nota ? `<tr><td colspan="3" style="padding:2px 12px 10px;border-bottom:1px solid #f5f5f5;color:#888;font-size:12px;font-style:italic;">${escapeHtml(c.nota)}</td></tr>` : "";
      const progresoCell = tieneProgreso ? `<td style="padding:10px 12px;border-bottom:1px solid #f5f5f5;font-size:13px;">${estrellas ? `<span style="color:#f59e0b;letter-spacing:1px;">${estrellas}</span><br>` : ""}${debBadge}</td>` : "";
      return `<tr><td style="padding:10px 12px;border-bottom:1px solid #f5f5f5;color:#404040;font-size:14px;">${fechaStr}</td><td style="padding:10px 12px;border-bottom:1px solid #f5f5f5;color:#404040;font-size:14px;">${escapeHtml(c.asignatura)}</td>${progresoCell}<td style="padding:10px 12px;border-bottom:1px solid #f5f5f5;text-align:right;color:#404040;font-size:14px;font-weight:600;">${escapeHtml(c.precio)}€</td></tr>${notaRow}`;
    })
    .join("");

  const progresoHeader = tieneProgreso ? '<th style="padding:10px 12px;text-align:left;color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Progreso</th>' : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center"><table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:620px;box-shadow:0 2px 12px rgba(0,0,0,0.06);"><tr><td style="background:#41f2c0;padding:22px 32px;"><span style="font-size:22px;font-weight:bold;color:#fff;letter-spacing:-0.5px;">Menttio</span><span style="font-size:12px;color:rgba(255,255,255,0.75);margin-left:10px;">Plataforma de clases particulares</span></td></tr><tr><td style="padding:32px 32px 0;"><h2 style="margin:0 0 6px;color:#404040;font-size:21px;">Tu informe de ${escapeHtml(d.mesLabel)}</h2><p style="margin:0 0 28px;color:#999;font-size:14px;">Clases completadas con ${escapeHtml(d.profesor)}</p><p style="color:#404040;font-size:15px;margin:0 0 24px;line-height:1.7;">Hola <strong>${escapeHtml(d.nombre)}</strong>,<br>aqui tienes el resumen de tus clases de <strong>${escapeHtml(d.mesLabel)}</strong>.</p><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin-bottom:6px;"><thead><tr style="background:#f8f9fa;"><th style="padding:10px 12px;text-align:left;color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha</th><th style="padding:10px 12px;text-align:left;color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Asignatura</th>${progresoHeader}<th style="padding:10px 12px;text-align:right;color:#999;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Precio</th></tr></thead><tbody>${clasesRows}<tr style="background:#f8f9fa;"><td colspan="${tieneProgreso ? 3 : 2}" style="padding:13px 12px;font-weight:bold;color:#404040;font-size:14px;">Total del mes</td><td style="padding:13px 12px;text-align:right;font-weight:bold;color:#41f2c0;font-size:18px;">${escapeHtml(d.totalPrecio)}€</td></tr></tbody></table></td></tr><tr><td style="padding:24px 32px;"><p style="color:#ccc;font-size:12px;margin:0;line-height:1.6;">Informe enviado automaticamente por Menttio. Para cualquier consulta escribe a <a href="mailto:hola@menttio.com" style="color:#41f2c0;text-decoration:none;">hola@menttio.com</a>.</p></td></tr><tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #f0f0f0;"><span style="color:#ccc;font-size:11px;">© ${new Date().getFullYear()} Menttio · menttio.com</span></td></tr></table></td></tr></table></body></html>`;

  return { subject: `Tu informe de clases de ${d.mesLabel} - Menttio`, html };
}
