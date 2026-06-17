import Stripe from "stripe";
import { type Env, HttpError } from "../env";
import { requireUser, requireAdmin } from "../lib/auth";
import * as db from "../lib/db";

// Precios de planes "exentos" (0€) en Stripe — del workflow original.
const EXEMPT_PRICES: Record<string, string> = {
  basic: "price_1T6TtwHAmL0VZFroEzHxUnpt",
  premium: "price_1T6TtwHAmL0VZFroALx8VVZO",
};

// Cliente Stripe compatible con Cloudflare Workers (fetch http client).
function stripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, "STRIPE_SECRET_KEY no configurada");
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia" as any,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

async function teacherByEmail(env: Env, email: string): Promise<any | null> {
  const rows = await db.list<any>(env, "teachers", { user_email: `eq.${email}` });
  return rows[0] || null;
}

// createCheckout: sesión de pago de una clase (con transfer a la cuenta Connect del profe si la tiene).
export async function createCheckout(env: Env, req: Request, b: any) {
  const user = await requireUser(env, req);
  const stripe = stripeClient(env);
  const students = await db.list<any>(env, "students", { user_email: `eq.${user.email}` });
  if (!students[0]) throw new HttpError(404, "Student not found");
  const student = students[0];
  const teachers = await db.list<any>(env, "teachers", { id: `eq.${b.teacherId}` });
  const teacher = teachers[0] || null;
  const origin = req.headers.get("origin") || "https://menttio.com";

  const params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `Clase de ${b.subjectName}`, description: `Con ${b.teacherName} - ${b.date} a las ${b.startTime}` },
        unit_amount: Math.round(b.price * 100),
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/book-class`,
    metadata: {
      bookingId: b.bookingId || "", student_id: student.id, student_name: student.full_name,
      student_email: user.email || "", teacher_id: b.teacherId, teacher_name: b.teacherName,
      teacher_email: b.teacherEmail, subject_id: b.subjectId, subject_name: b.subjectName,
      date: b.date, start_time: b.startTime, end_time: b.endTime,
      duration_minutes: String(b.duration), price: String(b.price),
    },
  };
  if (teacher?.stripe_connect_account_id && teacher?.stripe_connect_enabled) {
    params.payment_intent_data = { transfer_data: { destination: teacher.stripe_connect_account_id } };
  }
  const session = await stripe.checkout.sessions.create(params);
  return { url: session.url };
}

// getStripeConnectStatus: estado de la cuenta Connect del profesor.
export async function getStripeConnectStatus(env: Env, req: Request) {
  const user = await requireUser(env, req);
  const stripe = stripeClient(env);
  const teacher = await teacherByEmail(env, user.email!);
  if (!teacher || !teacher.stripe_connect_account_id) return { connected: false, enabled: false };

  const account = await stripe.accounts.retrieve(teacher.stripe_connect_account_id);
  const enabled = !!(account.charges_enabled && account.payouts_enabled);
  if (enabled !== teacher.stripe_connect_enabled) {
    await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { stripe_connect_enabled: enabled });
  }
  return {
    connected: true, enabled, account_id: account.id,
    charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted, email: account.email,
    requirements: account.requirements?.currently_due || [],
    eventually_due: account.requirements?.eventually_due || [],
  };
}

// connectStripeAccount: crea (si no existe) la cuenta Connect Express y devuelve el link de onboarding.
export async function connectStripeAccount(env: Env, req: Request) {
  const user = await requireUser(env, req);
  const stripe = stripeClient(env);
  const teacher = await teacherByEmail(env, user.email!);
  if (!teacher) throw new HttpError(404, "Teacher not found");
  const origin = req.headers.get("origin") || "https://menttio.com";

  let accountId = teacher.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express", country: "ES", email: user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: { product_description: "Clases particulares de refuerzo escolar" },
      metadata: { teacher_id: teacher.id, teacher_email: user.email || "" },
    });
    accountId = account.id;
    await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { stripe_connect_account_id: accountId, stripe_connect_enabled: false });
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/Profile?connect=refresh`,
    return_url: `${origin}/Profile?connect=success`,
    type: "account_onboarding",
  });
  return { url: link.url };
}

// getSubscriptionInfo: estado de la suscripción del profesor (sincroniza con Stripe si procede).
export async function getSubscriptionInfo(env: Env, req: Request) {
  const user = await requireUser(env, req);
  const stripe = stripeClient(env);
  const teacher = await teacherByEmail(env, user.email!);
  if (!teacher) throw new HttpError(404, "Teacher not found");

  const result: any = {
    subscription_active: false, subscription_plan: teacher.subscription_plan || "basic",
    subscription_expires: null, trial_active: false, trial_end_date: null,
    stripe_customer_id: teacher.stripe_customer_id, stripe_subscription_id: teacher.stripe_subscription_id,
    payment_method: null, subscription_details: null, portal_url: null,
  };

  if (!teacher.stripe_subscription_id && teacher.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({ customer: teacher.stripe_customer_id, limit: 1, status: "all" });
    if (subs.data[0]) {
      teacher.stripe_subscription_id = subs.data[0].id;
      await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { stripe_subscription_id: subs.data[0].id });
    }
  }

  if (!teacher.stripe_subscription_id) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let trialActive = !!teacher.trial_active, subActive = !!teacher.subscription_active;
    if (teacher.subscription_exempt) { subActive = true; trialActive = false; }
    else {
      if (trialActive && teacher.trial_end_date && new Date(teacher.trial_end_date) < now) {
        trialActive = false; subActive = false;
        await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { trial_active: false, trial_used: true, subscription_active: false });
      }
      if (subActive && !trialActive && teacher.subscription_expires && new Date(teacher.subscription_expires) < now) {
        subActive = false;
        await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { subscription_active: false });
      }
    }
    result.subscription_active = subActive; result.trial_active = trialActive;
    result.trial_end_date = teacher.trial_end_date || null; result.subscription_expires = teacher.subscription_expires || null;
    return result;
  }

  const sub = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);
  const isTrial = sub.status === "trialing";
  const isActive = sub.status === "active" || sub.status === "trialing";
  const trialEnd = isTrial ? sub.trial_end : null;
  result.subscription_details = {
    status: sub.status, current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end, cancel_at_period_end: sub.cancel_at_period_end, trial_end: trialEnd,
  };
  result.subscription_active = isActive; result.trial_active = isTrial;
  result.trial_end_date = trialEnd ? new Date(trialEnd * 1000).toISOString().split("T")[0] : null;
  result.subscription_expires = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString().split("T")[0] : null;
  return result;
}

// handleSubscriptionExempt: al marcar un profesor como exento, migra su suscripción Stripe a 0€.
export async function handleSubscriptionExempt(env: Env, req: Request, body: any) {
  await requireAdmin(env, req);
  const stripe = stripeClient(env);
  const teacherId = body.teacherId || body.event?.entity_id;
  if (!teacherId) throw new HttpError(400, "teacherId requerido");
  const rows = await db.list<any>(env, "teachers", { id: `eq.${teacherId}` });
  const teacher = rows[0];
  if (!teacher?.subscription_exempt) return { ok: true, skipped: "teacher is not exempt" };

  const exemptPriceId = EXEMPT_PRICES[teacher.subscription_plan || "basic"];
  if (teacher.stripe_subscription_id) {
    const sub = await stripe.subscriptions.retrieve(teacher.stripe_subscription_id);
    const currentPrice = sub.items.data[0]?.price?.id;
    if (Object.values(EXEMPT_PRICES).includes(currentPrice || "")) return { ok: true, skipped: "already on 0€ plan" };
    const itemId = sub.items.data[0]?.id;
    await stripe.subscriptions.update(teacher.stripe_subscription_id, {
      items: [{ id: itemId, price: exemptPriceId }], proration_behavior: "none",
    });
  }
  await db.update(env, "teachers", { id: `eq.${teacher.id}` }, { subscription_active: true, subscription_expires: null, trial_active: false });
  return { ok: true, message: `Suscripción migrada a 0€ plan ${teacher.subscription_plan || "basic"}` };
}
