// Mapeo de nombres de campo entre el SDK de Base44 (lo que usa el frontend) y las columnas
// de Supabase. Permite que el adapter sea transparente: el frontend sigue usando created_date,
// updated_date, created_by_id, y por debajo se traducen a created_at, updated_at, created_by.

const TO_DB = {
  created_date: "created_at",
  updated_date: "updated_at",
  created_by_id: "created_by",
};
const FROM_DB = Object.fromEntries(Object.entries(TO_DB).map(([k, v]) => [v, k]));

// Traduce el nombre de un campo Base44 -> columna Supabase (para filtros y sort).
export function toDbField(name) {
  return TO_DB[name] || name;
}

// Traduce un objeto Base44 -> fila Supabase (claves).
export function toDbRow(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[toDbField(k)] = v;
  return out;
}

// Traduce una fila Supabase -> objeto con nombres Base44 (para el frontend).
export function fromDbRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[FROM_DB[k] || k] = v;
  return out;
}
