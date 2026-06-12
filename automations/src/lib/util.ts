// Normaliza texto: sin espacios, sin acentos, ñ->n (igual que los "Code in JavaScript8" de n8n).
export function normalizeText(text: string): string {
  let s = (text ?? "").toString().replace(/\s+/g, "");
  const map: Record<string, string> = {
    á: "a", é: "e", í: "i", ó: "o", ú: "u",
    Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U",
    ü: "u", Ü: "U",
  };
  for (const [a, b] of Object.entries(map)) s = s.replace(new RegExp(a, "g"), b);
  return s.replace(/ñ/g, "n").replace(/Ñ/g, "N");
}

// Quita el prefijo +34 (con o sin espacio).
export function deleteCountryCode(tel: string): string {
  const t = (tel ?? "").toString();
  if (t.startsWith("+34 ")) return t.slice(4);
  if (t.startsWith("+34")) return t.slice(3);
  return t;
}

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Formatea un ISO datetime a {fecha:'dd-mm-yyyy', hora:'HH:MM'} en Europe/Madrid.
export function formatMadrid(iso: string): { fecha: string; hora: string; ymd: string } {
  const firstPart = (iso ?? "").split("_")[0];
  const d = new Date(firstPart);
  if (isNaN(d.getTime())) return { fecha: "", hora: "", ymd: "" };
  const fecha = d
    .toLocaleDateString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replaceAll("/", "-");
  const hora = d.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // yyyy-mm-dd en hora de Madrid
  const parts = d
    .toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" }); // en-CA => yyyy-mm-dd
  return { fecha, hora, ymd: parts };
}

export function splitName(full: string): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}
