import type { Env } from "../env";
import { getAccessToken, SCOPES } from "./google-auth";

// Hojas heredadas que el cron de n8n "Creacion videollamada" todavía consume.
// Mientras ese cron siga en n8n, el Worker debe mantener estas hojas alimentadas.
export const SHEET_ALUMNOS = {
  spreadsheetId: "1ebz0HBo-jyZgx4ayYntNvVAgSjzjWFYE0MKAPPs5VQU",
  tab: "Alumnos_data_sheet",
  gid: 1666234450,
  // Orden de columnas A..N (debe coincidir con la cabecera real de la hoja).
  // A:Alumno ID B:Pedido ID C:Nombre D:Apellidos E:Correo F:Telefono G:Plan
  // H:Precio I:Fecha de inicio J:Estado K:Informacion L:URL Jitsi M:Profesor N:Correo profesor
  keyCol: 1, // "Pedido ID" (B) = booking_id, índice 0-based 1
};

export const SHEET_GRABACIONES = {
  spreadsheetId: "1nMW1_WhHSPm-GylDv8TCgdbeXgNAOXg9EnLMxHPpJ-8",
  tab: "RaulNavamuel",
  gid: 741029712,
  // A:ID clase B:ID alumno C:Fecha D:Asignatura E:Profesor F:Id archivo Drive G:(vacia) H:Estado
  keyCol: 0, // "ID clase" (A) = booking_id
};

type Cell = string | number | null;
interface SheetRef { spreadsheetId: string; tab: string; gid: number; }

const API = "https://sheets.googleapis.com/v4/spreadsheets";

// Añade una fila al final de la pestaña.
export async function appendRow(env: Env, sheet: SheetRef, values: Cell[]): Promise<void> {
  const token = await getAccessToken(env, SCOPES.drive);
  const range = `${encodeURIComponent(sheet.tab)}!A:A`;
  const res = await fetch(
    `${API}/${sheet.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [values] }),
    },
  );
  if (!res.ok) throw new Error(`Sheets append ${sheet.tab} (${res.status}): ${await res.text()}`);
}

// Devuelve el número de fila (1-based) cuya columna keyCol == value, o -1.
export async function findRowNumber(env: Env, sheet: SheetRef, keyCol: number, value: string): Promise<number> {
  const token = await getAccessToken(env, SCOPES.drive);
  const colLetter = String.fromCharCode(65 + keyCol);
  const range = `${encodeURIComponent(sheet.tab)}!${colLetter}:${colLetter}`;
  const res = await fetch(`${API}/${sheet.spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets read ${sheet.tab} (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? "").toString().trim() === value.toString().trim()) return i + 1;
  }
  return -1;
}

// Escribe un valor en una celda concreta (rowNumber 1-based, col 0-based).
export async function updateCell(env: Env, sheet: SheetRef, rowNumber: number, col: number, value: Cell): Promise<void> {
  const token = await getAccessToken(env, SCOPES.drive);
  const colLetter = String.fromCharCode(65 + col);
  const range = `${encodeURIComponent(sheet.tab)}!${colLetter}${rowNumber}`;
  const res = await fetch(
    `${API}/${sheet.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[value]] }),
    },
  );
  if (!res.ok) throw new Error(`Sheets updateCell ${sheet.tab} (${res.status}): ${await res.text()}`);
}

// Borra una fila entera (rowNumber 1-based) usando batchUpdate deleteDimension.
export async function deleteRow(env: Env, sheet: SheetRef, rowNumber: number): Promise<void> {
  const token = await getAccessToken(env, SCOPES.drive);
  const res = await fetch(`${API}/${sheet.spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.gid, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Sheets deleteRow ${sheet.tab} (${res.status}): ${await res.text()}`);
}
