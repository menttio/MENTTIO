import type { Env } from "../env";
import { getAccessToken, SCOPES } from "./google-auth";

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function driveToken(env: Env): Promise<string> {
  return getAccessToken(env, SCOPES.drive);
}

// Busca una subcarpeta por nombre dentro de un parent. Devuelve su id o null.
export async function findFolder(
  env: Env,
  parentId: string,
  name: string,
): Promise<string | null> {
  const token = await driveToken(env);
  const q = `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("pageSize", "1");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive search error (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files && data.files.length ? data.files[0].id : null;
}

export async function createFolder(env: Env, parentId: string, name: string): Promise<string> {
  const token = await driveToken(env);
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  if (!res.ok) throw new Error(`Drive create folder error (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function findOrCreateFolder(
  env: Env,
  parentId: string,
  name: string,
): Promise<string> {
  return (await findFolder(env, parentId, name)) ?? (await createFolder(env, parentId, name));
}

// Recorre/crea una ruta de carpetas y devuelve el id de la última.
export async function resolveFolderPath(
  env: Env,
  rootId: string,
  segments: string[],
): Promise<string> {
  let current = rootId;
  for (const seg of segments) {
    if (!seg) continue;
    current = await findOrCreateFolder(env, current, seg);
  }
  return current;
}

// Sube un archivo (multipart) a una carpeta de Drive.
export async function uploadFile(
  env: Env,
  folderId: string,
  fileName: string,
  content: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const token = await driveToken(env);
  const boundary = "menttio_" + crypto.randomUUID();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + content.byteLength + tail.length);
  body.set(head, 0);
  body.set(new Uint8Array(content), head.length);
  body.set(tail, head.length + content.byteLength);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive upload error (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}
