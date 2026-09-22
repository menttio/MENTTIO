import type { Env } from "./env";
import { getAccessToken, SCOPES } from "./lib/google-auth";

// Las grabaciones de Meet viven en una carpeta de menttio@ que estaba compartida como
// "cualquiera con el enlace". Eso deja las clases de menores al alcance de cualquiera que
// tenga (o adivine) la dirección. Aquí se cambia a acceso nominal: cada grabación se
// comparte solo con su alumno y su profesor, y se retira el acceso público.
const REC_FOLDER = "1HQc4hFsrXXuoPnCu_meG54nIzOHMK2eO";

interface DrivePermission {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
}

async function driveFetch(env: Env, url: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken(env, SCOPES.drive); // impersona menttio@menttio.com
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Drive ${res.status}: ${JSON.stringify(data.error?.message ?? data).slice(0, 200)}`);
  }
  return data;
}

export async function listPermissions(env: Env, fileId: string): Promise<DrivePermission[]> {
  const data = await driveFetch(
    env,
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress)&supportsAllDrives=true`,
  );
  return (data.permissions ?? []) as DrivePermission[];
}

async function addReader(env: Env, fileId: string, email: string): Promise<void> {
  await driveFetch(
    env,
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
    { method: "POST", body: JSON.stringify({ role: "reader", type: "user", emailAddress: email }) },
  );
}

async function removePermission(env: Env, fileId: string, permissionId: string): Promise<void> {
  await driveFetch(
    env,
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}?supportsAllDrives=true`,
    { method: "DELETE" },
  );
}

/** Deja una grabación accesible solo para su alumno y su profesor. */
export async function asegurarAccesoGrabacion(
  env: Env,
  fileId: string,
  emails: string[],
  dryRun = false,
): Promise<{ añadidos: string[]; publicoRetirado: boolean; errores: string[] }> {
  const out = { añadidos: [] as string[], publicoRetirado: false, errores: [] as string[] };
  const permisos = await listPermissions(env, fileId);
  const yaTienen = new Set(
    permisos.filter((p) => p.type === "user" && p.emailAddress).map((p) => p.emailAddress!.toLowerCase()),
  );

  for (const email of emails) {
    const limpio = (email ?? "").trim().toLowerCase();
    if (!limpio || yaTienen.has(limpio)) continue;
    try {
      if (!dryRun) await addReader(env, fileId, limpio);
      out.añadidos.push(limpio);
    } catch (e) {
      out.errores.push(`compartir con ${limpio}: ${(e as Error).message}`);
    }
  }

  // Solo se retira el acceso público si alguien nominal puede seguir viéndola.
  // Si el permiso es heredado de la carpeta, Drive responde 403: se retira en la carpeta.
  const publico = permisos.filter((p) => p.type === "anyone" || p.type === "domain");
  const quedaAlguien = yaTienen.size > 0 || out.añadidos.length > 0;
  if (publico.length > 0 && quedaAlguien) {
    for (const p of publico) {
      try {
        if (!dryRun) await removePermission(env, fileId, p.id);
        out.publicoRetirado = true;
      } catch (e) {
        out.errores.push(`retirar ${p.type}: ${(e as Error).message}`);
      }
    }
  }
  return out;
}

/** Lista las grabaciones de la carpeta, con el identificador de reserva extraído del nombre. */
export async function listarGrabaciones(
  env: Env,
  pageToken?: string,
  size = 100,
): Promise<{ archivos: { id: string; name: string; bookingId: string | null }[]; nextPageToken: string | null }> {
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${REC_FOLDER}' in parents and trashed=false`)}` +
    `&fields=nextPageToken,files(id,name)&pageSize=${Math.min(Math.max(size, 1), 200)}&supportsAllDrives=true&includeItemsFromAllDrives=true` +
    (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
  const data = await driveFetch(env, url);
  const archivos = (data.files ?? []).map((f: any) => {
    const match = String(f.name).match(/_([0-9a-f-]{8,})(?:\s|$|_)/i);
    return { id: f.id, name: f.name, bookingId: match ? match[1] : null };
  });
  return { archivos, nextPageToken: data.nextPageToken ?? null };
}

/**
 * Aplica accesos nominales a un lote de grabaciones: comparte cada una con los correos
 * indicados y retira el acceso público del archivo. Los correos los calcula quien llama
 * (Menttio es la fuente de verdad de quién estuvo en cada clase).
 */
export async function aplicarAccesos(
  env: Env,
  items: { fileId: string; emails: string[] }[],
  dryRun = false,
): Promise<Record<string, unknown>> {
  const resumen = {
    dryRun,
    procesados: 0,
    compartidos: 0,
    publicosRetirados: 0,
    errores: [] as string[],
    detalle: [] as Record<string, unknown>[],
  };
  for (const item of items.slice(0, 8)) {
    try {
      const res = await asegurarAccesoGrabacion(env, item.fileId, item.emails ?? [], dryRun);
      resumen.procesados++;
      resumen.compartidos += res.añadidos.length;
      if (res.publicoRetirado) resumen.publicosRetirados++;
      resumen.errores.push(...res.errores);
      resumen.detalle.push({ fileId: item.fileId, añadidos: res.añadidos, publicoRetirado: res.publicoRetirado });
    } catch (e) {
      resumen.errores.push(`${item.fileId}: ${(e as Error).message}`);
    }
  }
  return resumen;
}

/** Retira el acceso público de la carpeta de grabaciones. */
export async function cerrarCarpeta(env: Env, dryRun = false): Promise<Record<string, unknown>> {
  const permisos = await listPermissions(env, REC_FOLDER);
  const publicos = permisos.filter((p) => p.type === "anyone" || p.type === "domain");
  const errores: string[] = [];
  for (const p of publicos) {
    try {
      if (!dryRun) await removePermission(env, REC_FOLDER, p.id);
    } catch (e) {
      errores.push(`${p.type}: ${(e as Error).message}`);
    }
  }
  return { dryRun, publicosEncontrados: publicos.map((p) => p.type), retirados: !dryRun && errores.length === 0, errores };
}
