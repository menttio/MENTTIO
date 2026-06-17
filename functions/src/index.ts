import { type Env, HttpError } from "./env";
import { getPublicTeachers } from "./functions/getPublicTeachers";
import { setMeetLink } from "./functions/setMeetLink";
import { getRecordingLink } from "./functions/getRecordingLink";
import { sendContactEmail } from "./functions/sendContactEmail";
import { deleteUserProfile } from "./functions/deleteUserProfile";
import { createCorporateUser } from "./functions/createCorporateUser";
import { registerTeacher } from "./functions/registerTeacher";
import { markCompletedClasses } from "./functions/markCompletedClasses";
import { cleanupUnpaidPremium } from "./functions/cleanupUnpaidPremium";
import {
  notifyN8N, notifyN8NBulk, notifyFileUpload, notifyClassPaid, notifyNuevoAlumno, notifyNuevoProfesor,
} from "./functions/notify";
import { chatAssistant } from "./functions/chatAssistant";
import { getVapidPublicKey } from "./functions/getVapidPublicKey";
import {
  createCheckout, getStripeConnectStatus, connectStripeAccount, getSubscriptionInfo, handleSubscriptionExempt,
  createTeacherSubscription,
} from "./functions/stripe";
import { getGoogleOAuthUrl, toggleGoogleCalendar } from "./functions/calendar";

// Worker que aloja las backend functions de la app (porte de las funciones Deno de Base44).
// El frontend las llama vía el adapter: POST {VITE_FUNCTIONS_URL}/{name} con el token de sesión.
type Handler = (env: Env, req: Request, body: any) => Promise<unknown>;

const FUNCTIONS: Record<string, Handler> = {
  getPublicTeachers: (env, req) => getPublicTeachers(env, req),
  setMeetLink: (env, req, body) => setMeetLink(env, req, body),
  getRecordingLink: (env, req, body) => getRecordingLink(env, req, body),
  sendContactEmail: (env, req, body) => sendContactEmail(env, req, body),
  deleteUserProfile: (env, req, body) => deleteUserProfile(env, req, body),
  createCorporateUser: (env, req, body) => createCorporateUser(env, req, body),
  registerTeacher: (env, req, body) => registerTeacher(env, req, body),
  markCompletedClasses: (env, req) => markCompletedClasses(env, req),
  cleanupUnpaidPremium: (env, req) => cleanupUnpaidPremium(env, req),
  notifyN8N: (env, req, body) => notifyN8N(env, req, body),
  notifyN8NBulk: (env, req, body) => notifyN8NBulk(env, req, body),
  notifyFileUpload: (env, req, body) => notifyFileUpload(env, req, body),
  notifyClassPaid: (env, req, body) => notifyClassPaid(env, req, body),
  notifyNuevoAlumno: (env, req, body) => notifyNuevoAlumno(env, req, body),
  notifyNuevoProfesor: (env, req, body) => notifyNuevoProfesor(env, req, body),
  chatAssistant: (env, req, body) => chatAssistant(env, req, body),
  getVapidPublicKey: (env) => getVapidPublicKey(env),
  createCheckout: (env, req, body) => createCheckout(env, req, body),
  getStripeConnectStatus: (env, req) => getStripeConnectStatus(env, req),
  connectStripeAccount: (env, req) => connectStripeAccount(env, req),
  getSubscriptionInfo: (env, req) => getSubscriptionInfo(env, req),
  handleSubscriptionExempt: (env, req, body) => handleSubscriptionExempt(env, req, body),
  createTeacherSubscription: (env, req, body) => createTeacherSubscription(env, req, body),
  getGoogleOAuthUrl: (env, req, body) => getGoogleOAuthUrl(env, req, body),
  toggleGoogleCalendar: (env, req, body) => toggleGoogleCalendar(env, req, body),
  // Pendientes (necesitan tokens de usuario / sig / pruebas): googleOAuthCallback,
  // getGoogleCalendarEvents, syncGoogleCalendar, deleteGoogleCalendarEvent, debugGoogleCalendar,
  // stripeWebhook, deleteAccount, sendPushNotification.
};

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(env) });

    const url = new URL(req.url);
    const name = url.pathname.replace(/^\//, "");
    if (req.method === "GET" && name === "") {
      return json({ service: "menttio-functions", ok: true }, 200, env);
    }

    const handler = FUNCTIONS[name];
    if (!handler) return json({ error: "Not found" }, 404, env);

    let body: unknown = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: "Invalid JSON" }, 400, env);
    }

    try {
      const result = await handler(env, req, body);
      return json(result ?? { success: true }, 200, env);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: (err as Error).message }, status, env);
    }
  },
};
