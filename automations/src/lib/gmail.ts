import type { Env } from "../env";
import { getAccessToken, SCOPES } from "./google-auth";

// base64 estándar a partir de bytes, sin spread (seguro para payloads grandes).
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Codifica una cabecera en UTF-8 estilo MIME (=?UTF-8?B?...?=) por si lleva acentos/emojis.
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

// Envía un email vía Gmail API impersonando GOOGLE_IMPERSONATE (menttio@menttio.com).
export async function sendEmail(env: Env, opts: SendEmailOptions): Promise<void> {
  const token = await getAccessToken(env, SCOPES.gmail);
  const from = opts.fromName
    ? `${encodeHeader(opts.fromName)} <${env.GOOGLE_IMPERSONATE}>`
    : env.GOOGLE_IMPERSONATE;

  const mime = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    bytesToBase64(new TextEncoder().encode(opts.html)).replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(mime) }),
    },
  );

  if (!res.ok) {
    throw new Error(`Error enviando email Gmail (${res.status}): ${await res.text()}`);
  }
}
