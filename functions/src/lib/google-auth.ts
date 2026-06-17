import type { Env } from "../env";

// Scopes de Google que usaban los workflows de n8n:
export const SCOPES = {
  gmail: ["https://www.googleapis.com/auth/gmail.send"],
  admin: [
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.group.member",
  ],
  drive: ["https://www.googleapis.com/auth/drive"],
  calendar: ["https://www.googleapis.com/auth/calendar"],
};

// Cache de tokens por conjunto de scopes durante la vida del isolate.
const tokenCache = new Map<string, { token: string; exp: number }>();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlStr(s: string): string {
  return base64url(new TextEncoder().encode(s));
}

// Convierte un PEM PKCS#8 en un CryptoKey RS256 para firmar.
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.replace(/\\n/g, "\n");
  const body = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// Equivalente a los nodos "Code in JavaScript2/4" (firma JWT) + "HTTP Request" (token).
export async function getAccessToken(env: Env, scopes: string[], impersonate?: string): Promise<string> {
  const sub = impersonate || env.GOOGLE_IMPERSONATE;
  const cacheKey = `${sub}|${scopes.join(" ")}`;
  const cached = tokenCache.get(cacheKey);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: env.GOOGLE_SA_CLIENT_EMAIL,
    sub, // impersonación (domain-wide delegation); por defecto GOOGLE_IMPERSONATE
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64urlStr(JSON.stringify(header))}.${base64urlStr(JSON.stringify(payload))}`;
  const key = await importPrivateKey(env.GOOGLE_SA_PRIVATE_KEY);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Error obteniendo token Google (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, { token: data.access_token, exp: now + data.expires_in });
  return data.access_token;
}
