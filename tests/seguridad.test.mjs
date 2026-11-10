// Tests de regresion de seguridad de Menttio (lote G, 10/11/2026). Sin dependencias:
//
//   node --test tests/
//
// Llaman a PRODUCCION (menttio.com y el worker) solo con peticiones que tienen que ser rechazadas
// o que no cambian nada. Sirven para detectar si un cambio futuro (o una publicacion desde el
// editor de Base44) vuelve a abrir algo que se cerro en los lotes A-F.
//
// Con MENTTIO_TEST_TOKEN (la sesion de un ALUMNO de prueba que NO sea admin ni profesor) se
// ejecutan ademas las pruebas de reglas con sesion. Como sacar el token: entrar en menttio.com
// con esa cuenta y, en la consola del navegador,
//   localStorage.getItem(Object.keys(localStorage).find((k) => /access_token/.test(k)))

import test from 'node:test';
import assert from 'node:assert/strict';

const APP = '694471e9c204eb0088437b85';
const BASE = `https://menttio.com/api/apps/${APP}`;
const WORKER = 'https://menttio-automations.raul2000plgr.workers.dev';
const TOKEN = process.env.MENTTIO_TEST_TOKEN || '';
const SESION = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

async function llamar(metodo, url, { body, headers = {} } = {}) {
  const r = await fetch(url, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* html o vacio */ }
  return { status: r.status, texto, json };
}
const funcion = (nombre, body = {}, headers = {}) => llamar('POST', `${BASE}/functions/${nombre}`, { body, headers });

// ---------------------------------------------------------------- 1. Funciones con sesion
const CON_SESION = [
  'bookingActions', 'teacherAccount', 'chatActions', 'classPayment', 'paymentOptions', 'closeAccount',
  'setRecordingConsent', 'notifyN8N', 'studentsOfTeacher', 'deleteGoogleCalendarEvent', 'myGroupClasses',
  'joinGroupClass', 'recordingUrl', 'familyReport', 'crearResena', 'subscriptionCheckout', 'stripeOnboarding',
  'getGoogleOAuthUrl', 'teachersDirectory', 'bookingSlots', 'teacherPlan',
];
for (const f of CON_SESION) {
  test(`sin sesion, ${f} responde 401`, async () => {
    const r = await funcion(f);
    assert.equal(r.status, 401, r.texto.slice(0, 200));
  });
}

// ---------------------------------------------------------------- 2. Solo admin o tarea programada
// Algunas responden 500 porque auth.me() lanza sin sesion: no hacen nada, pero lo correcto es que
// nunca respondan 200 a un desconocido.
const SOLO_ADMIN = [
  'bizumAdmin', 'syncAllBookings', 'notifyN8NBulk', 'syncGoogleCalendar', 'getGoogleCalendarEvents',
  'getSubscriptionInfo', 'getStripeConnectStatus', 'toggleGoogleCalendar', 'notifyFileUpload',
  'sendPushNotification', 'deleteUserProfile', 'markCompletedClasses', 'expireStaleTrials', 'cleanupUnpaidPremium',
];
for (const f of SOLO_ADMIN) {
  test(`sin credenciales, ${f} no responde 2xx`, async () => {
    const r = await funcion(f);
    assert.ok(r.status >= 400, `respondio ${r.status}: ${r.texto.slice(0, 200)}`);
  });
}

// ---------------------------------------------------------------- 3. Clave compartida con el worker
for (const f of ['consentimientoClase', 'recordingActions', 'saveRecording', 'setMeetLinkAuto']) {
  test(`con clave incorrecta, ${f} responde 401`, async () => {
    const r = await funcion(f, { booking_id: 'x' }, { 'x-automation-key': 'incorrecta' });
    assert.equal(r.status, 401, r.texto.slice(0, 200));
  });
}

test('registerTeacher sigue retirada (410)', async () => {
  assert.equal((await funcion('registerTeacher')).status, 410);
});

test('stripeInbox rechaza un aviso sin firma (400)', async () => {
  const r = await funcion('stripeInbox', { type: 'checkout.session.completed' });
  assert.equal(r.status, 400);
});

test('confirmarConsentimientoTutor rechaza un enlace falso', async () => {
  const r = await llamar('GET', `${BASE}/functions/confirmarConsentimientoTutor?t=falso.falso`);
  assert.match(r.texto, /Enlace no v[aá]lido/);
});

// ---------------------------------------------------------------- 4. Entidades sin sesion
const PRIVADAS = ['Booking', 'Teacher', 'Student', 'Notification', 'Conversation', 'Message', 'Consent', 'FamilyReport'];
for (const e of PRIVADAS) {
  test(`sin sesion, ${e} no devuelve datos`, async () => {
    const r = await llamar('GET', `${BASE}/entities/${e}?limit=5`);
    assert.ok(r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), `devolvio datos: ${r.texto.slice(0, 200)}`);
  });
}
for (const e of [...PRIVADAS, 'Availability', 'Subject', 'Review']) {
  test(`sin sesion, no se puede crear ${e}`, async () => {
    const r = await llamar('POST', `${BASE}/entities/${e}`, { body: { description: 'test de seguridad' } });
    assert.ok(r.status === 401 || r.status === 403, `respondio ${r.status}: ${r.texto.slice(0, 200)}`);
  });
}

// ---------------------------------------------------------------- 5. Worker
test('worker: la portada responde', async () => {
  assert.equal((await llamar('GET', `${WORKER}/`)).status, 200);
});
const RUTAS_WORKER = [
  ['POST', '/baja'], ['GET', '/admin/auditoria-grabaciones'], ['POST', '/admin/cuarentena'],
  ['GET', '/admin/consentimiento'], ['POST', '/cron/videollamadas'], ['POST', '/reserva/estado'],
  ['POST', '/mantenimiento/grabaciones/listar'], ['POST', '/importar-grabaciones'],
];
for (const [m, p] of RUTAS_WORKER) {
  test(`worker: ${m} ${p} sin clave responde 401`, async () => {
    const r = await llamar(m, `${WORKER}${p}`, {
      body: m === 'POST' ? { email: 'x@y.z' } : undefined,
      headers: { 'x-admin-key': 'incorrecta', 'x-automation-key': 'incorrecta' },
    });
    assert.equal(r.status, 401, r.texto.slice(0, 200));
  });
}

// ---------------------------------------------------------------- 6. Con sesion de alumno
const conToken = { skip: TOKEN ? false : 'sin MENTTIO_TEST_TOKEN' };

test('alumno: no puede escribir directamente reservas, avisos, chat, fichas de profesor ni horarios', conToken, async () => {
  for (const e of ['Booking', 'Notification', 'Conversation', 'Message', 'Teacher', 'Availability', 'Subject']) {
    const r = await llamar('POST', `${BASE}/entities/${e}`, { body: { description: 'test de seguridad' }, headers: SESION });
    assert.equal(r.status, 403, `${e}: ${r.status} ${r.texto.slice(0, 160)}`);
  }
});

test('alumno: no puede registrarse un permiso de grabacion desde el navegador', conToken, async () => {
  const yo = await llamar('GET', `${BASE}/entities/User/me`, { headers: SESION });
  assert.equal(yo.status, 200);
  const r = await llamar('POST', `${BASE}/entities/Consent`, {
    body: { user_email: yo.json.email, type: 'grabacion', granted: true, description: 'test de seguridad' },
    headers: SESION,
  });
  assert.equal(r.status, 403, r.texto.slice(0, 200));
});

test('alumno: bookingActions rechaza reservas y acciones sobre clases ajenas', conToken, async () => {
  assert.equal((await funcion('bookingActions', { accion: 'pago', booking_id: 'no-existe', estado: 'paid' }, SESION)).status, 404);
  assert.equal((await funcion('bookingActions', { accion: 'crear', teacher_id: 'no-existe' }, SESION)).status, 404);
});

test('alumno: no puede abrir chat como profesor ni tocar una ficha de profesor', conToken, async () => {
  assert.equal((await funcion('chatActions', { accion: 'iniciar', student_id: 'cualquiera' }, SESION)).status, 403);
  assert.equal((await funcion('teacherAccount', { accion: 'actualizar', campos: { subscription_plan: 'premium' } }, SESION)).status, 404);
});
