// Textos de consentimiento. Se guarda la versión y el texto exacto que aceptó cada persona,
// porque un consentimiento solo vale si se puede demostrar qué se aceptó y cuándo.
export const CONSENT_VERSION = "2026-09-v1";

// En España, por debajo de 14 años el consentimiento lo da el padre, la madre o el tutor
// (art. 8 RGPD y art. 7 LOPDGDD).
export const EDAD_CONSENTIMIENTO = 14;

export function esMenorDeEdadDigital(birthDate) {
  if (!birthDate) return null;
  const nacimiento = new Date(birthDate);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return { edad, esMenor: edad < EDAD_CONSENTIMIENTO };
}

export const TEXTOS = {
  privacidad: {
    alumno:
      "He leído la política de privacidad de Menttio y acepto que se traten mis datos " +
      "(nombre, correo, teléfono, clases reservadas y notas de progreso) para gestionar mis clases.",
    tutor:
      "Como padre, madre o tutor legal del alumno, he leído la política de privacidad de Menttio " +
      "y autorizo el tratamiento de sus datos (nombre, correo, teléfono, clases reservadas y notas " +
      "de progreso) para gestionar sus clases.",
  },
  grabacion: {
    alumno:
      "Autorizo que mis clases se graben en vídeo y que la grabación quede disponible para mí y para " +
      "mi profesor. Sé que puedo retirar este permiso cuando quiera desde mi perfil.",
    tutor:
      "Como padre, madre o tutor legal del alumno, autorizo que sus clases se graben en vídeo y que la " +
      "grabación quede disponible para él o ella y para su profesor. Sé que puedo retirar este permiso " +
      "cuando quiera desde el perfil del alumno.",
  },
};

export function textoDe(tipo, esMenor) {
  return TEXTOS[tipo][esMenor ? "tutor" : "alumno"];
}
