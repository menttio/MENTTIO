import { type Env, HttpError } from "../env";

// Base44: chatAssistant (chat de ventas/soporte, PÚBLICO). Portado del LLM de Base44 (créditos)
// a la API de Claude directa. Se activa cuando ANTHROPIC_API_KEY esté configurada.
const SYSTEM_PROMPT = `Eres el asistente de ventas y soporte de Menttio, una plataforma de gestión todo en uno para profesores particulares. Responde siempre en español, de forma natural, cercana y concisa — como si fuera el propio fundador explicando el producto. No uses listas largas ni texto excesivo. Ve al grano.

SOBRE MENTTIO:
Menttio es una plataforma todo en uno para profesores particulares. El profesor solo configura sus materias, precio y disponibilidad — Menttio gestiona el resto automáticamente.

FUNCIONALIDADES:
- Agenda inteligente: define disponibilidad una vez, los alumnos reservan solos en huecos libres, sin solapamientos ni WhatsApps.
- Reservas automáticas: los alumnos reservan, confirman y cancelan sin intervención del profesor.
- Pagos integrados: cobro centralizado y automático, sin perseguir transferencias.
- Clases grabadas: sesiones grabadas automáticamente, accesibles para el alumno cuando quiera.
- Materiales siempre accesibles: el profesor sube apuntes una vez, los alumnos los encuentran organizados.
- Gestión de alumnos: historial, seguimiento y progreso en un solo lugar.
- Chat con alumnos integrado en la plataforma.
- Panel de control con ingresos, horas y estadísticas.

PRECIOS:
- Alumnos: GRATIS siempre.
- Profesores: Plan Premium 36,99€/mes. Sin comisiones por clase. 14 días de prueba gratuita sin compromiso.

REGISTRO PROFESOR (5 minutos): https://menttio.com/TeacherSignup

MENTTIO NO: no interviene en el contenido de las clases, no fija precios, no cobra comisión por clase, no controla los horarios del profesor.

INSTRUCCIONES:
- Si el usuario muestra interés claro en registrarse, dale directamente el link: https://menttio.com/TeacherSignup
- Si tiene dudas, resuélvelas de forma honesta y concisa
- Si no le interesa, responde con amabilidad y cierra la conversación sin insistir
- Respuestas cortas y directas, máximo 3-4 frases por respuesta`;

export async function chatAssistant(env: Env, _req: Request, body: { messages?: Array<{ role: string; content: string }> }) {
  if (!Array.isArray(body.messages)) throw new HttpError(400, "messages array is required");
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "Chat no disponible (ANTHROPIC_API_KEY no configurada)");

  // Mapear roles al formato de la API de Claude (solo user/assistant; system aparte).
  const messages = body.messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new HttpError(502, `Claude API (${res.status}): ${JSON.stringify(data?.error ?? data).slice(0, 160)}`);
  const content = data?.content?.[0]?.text ?? "";
  return { content };
}
