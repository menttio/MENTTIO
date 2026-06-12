import type { Env } from "../env";
import { getAccessToken, SCOPES } from "./google-auth";

export interface CreateUserResult {
  primaryEmail: string;
  password: string;
}

// Genera la contraseña aleatoria (15 chars) igual que el "Code in JavaScript1" de n8n.
export function generatePassword(length = 15): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += charset.charAt(arr[i] % charset.length);
  return out;
}

// Normaliza igual que el "Code in JavaScript" de "Registrar profesor".
function normalize(text: string): string {
  return (text ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z]/g, "");
}

// Construye el email corporativo: {nombre}{3letras_ap1}{3letras_ap2}profesor@menttio.com
export function buildCorporateEmail(env: Env, firstNameRaw: string, lastNameRaw: string): string {
  const firstName = normalize(firstNameRaw);
  const parts = (lastNameRaw ?? "").toString().trim().split(/\s+/).filter(Boolean);
  const lastName1 = parts[0] ? normalize(parts[0]).substring(0, 3) : "";
  const lastName2 = parts[1] ? normalize(parts[1]).substring(0, 3) : "";
  return `${firstName}${lastName1}${lastName2}profesor@${env.GOOGLE_WORKSPACE_DOMAIN}`;
}

// Crea la cuenta Workspace (equivale a "HTTP Request1" POST .../directory/v1/users).
export async function createWorkspaceUser(
  env: Env,
  args: { primaryEmail: string; givenName: string; familyName: string; password: string },
): Promise<void> {
  const token = await getAccessToken(env, SCOPES.admin);
  const res = await fetch("https://admin.googleapis.com/admin/directory/v1/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      primaryEmail: args.primaryEmail,
      name: { givenName: args.givenName, familyName: args.familyName || args.givenName },
      password: args.password,
      changePasswordAtNextLogin: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Error creando usuario Workspace (${res.status}): ${await res.text()}`);
  }
}

// Borra la cuenta Workspace (equivale a "HTTP Request3" DELETE .../directory/v1/users/{email}).
export async function deleteWorkspaceUser(env: Env, primaryEmail: string): Promise<void> {
  const token = await getAccessToken(env, SCOPES.admin);
  const res = await fetch(
    `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(primaryEmail)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  // 404 = ya no existe: lo tratamos como éxito idempotente.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Error borrando usuario Workspace (${res.status}): ${await res.text()}`);
  }
}
