/**
 * Reglas de una asignatura del profesor: si da clases individuales, grupales o las dos,
 * y a qué precio.
 *
 * Las asignaturas creadas antes de que existieran las casillas no llevan `offers_individual`
 * ni `offers_group`. Para esas hay que deducirlo: antes la clase individual era obligatoria
 * (el precio por hora era un campo requerido) y la grupal solo existía si el profesor había
 * configurado un máximo de alumnos. Sin esta deducción, al publicar el cambio las asignaturas
 * de todos los profesores actuales se quedarían sin ningún tipo de clase y nadie podría
 * reservar.
 */

/** Número de alumnos a partir del cual una clase grupal deja de tener tramos propios. */
export const MAX_TRAMOS_GRUPO = 4;

export function daIndividual(asignatura) {
  if (!asignatura) return false;
  if (asignatura.offers_individual == null) return true;
  return asignatura.offers_individual === true;
}

export function daGrupal(asignatura) {
  if (!asignatura) return false;
  if (asignatura.offers_group == null) {
    const max = parseInt(asignatura.max_group_students);
    return Number.isFinite(max) && max >= 2;
  }
  return asignatura.offers_group === true;
}

export function grupoIndefinido(asignatura) {
  return daGrupal(asignatura) && asignatura?.group_unlimited === true;
}

/**
 * Máximo de alumnos de una clase grupal. Devuelve null si es indefinido (sin tope) y 0 si
 * la asignatura no admite clases grupales.
 */
export function maxAlumnosGrupo(asignatura) {
  if (!daGrupal(asignatura)) return 0;
  if (grupoIndefinido(asignatura)) return null;
  const max = parseInt(asignatura?.max_group_students);
  return Number.isFinite(max) && max >= 2 ? max : MAX_TRAMOS_GRUPO;
}

/** Precios por defecto cuando el profesor no ha puesto tarifa para ese número de alumnos. */
export const PRECIOS_GRUPO_DEFECTO = { 2: 18, 3: 16, 4: 15 };

/**
 * Precio por persona y por hora de una clase grupal con `numAlumnos` dentro.
 *
 * Con grupo indefinido hay un único precio por persona, independiente de cuántos entren.
 * Con tramos, se busca el tramo exacto (topado al mayor que exista) y, si hay un solo alumno
 * apuntado, se cobra el precio individual; si la asignatura no da clases individuales se usa
 * el tramo de 2, que es el más barato para el profesor de los que ha configurado.
 */
export function precioGrupalPorHora(asignatura, numAlumnos) {
  if (!asignatura) return 0;

  if (grupoIndefinido(asignatura)) {
    const porPersona = Number(asignatura.group_price_per_person);
    return Number.isFinite(porPersona) && porPersona > 0 ? porPersona : 0;
  }

  if (numAlumnos <= 1) {
    if (daIndividual(asignatura)) return Number(asignatura.price_per_hour) || 0;
    return tramoGrupal(asignatura, 2);
  }

  return tramoGrupal(asignatura, numAlumnos);
}

function tramoGrupal(asignatura, numAlumnos) {
  const tramos = asignatura.group_prices || {};
  const tope = maxAlumnosGrupo(asignatura) || MAX_TRAMOS_GRUPO;
  const clave = Math.min(numAlumnos, tope, MAX_TRAMOS_GRUPO);
  const valor = tramos[String(clave)] ?? tramos[clave];
  if (valor != null && valor !== '' && Number(valor) > 0) return Number(valor);
  return Number(PRECIOS_GRUPO_DEFECTO[clave]) || Number(asignatura.price_per_hour) || 0;
}

/**
 * Precio total de una clase, en euros, según el tipo y la duración en minutos.
 * `numAlumnos` solo se usa en las grupales.
 */
export function precioClase(asignatura, { tipo = 'individual', duracionMinutos = 60, numAlumnos = 1 } = {}) {
  if (!asignatura) return 0;
  let porHora;
  if (tipo === 'group') {
    porHora = precioGrupalPorHora(asignatura, numAlumnos);
  } else if (daIndividual(asignatura)) {
    porHora = Number(asignatura.price_per_hour) || 0;
  } else {
    // La asignatura no se da individual pero el profesor esta creando una clase a mano para un
    // alumno: mejor cobrar la tarifa de grupo que dejar la clase a 0 € sin que se entere nadie.
    porHora = precioGrupalPorHora(asignatura, 1);
  }
  return (porHora * duracionMinutos) / 60;
}

/** Texto corto del precio de una asignatura para listados y fichas públicas. */
export function textoPrecio(asignatura) {
  if (!asignatura) return null;
  if (daIndividual(asignatura)) {
    const p = Number(asignatura.price_per_hour);
    if (Number.isFinite(p) && p > 0) return `${p}€/h`;
  }
  if (daGrupal(asignatura)) {
    const p = precioGrupalPorHora(asignatura, grupoIndefinido(asignatura) ? 1 : 2);
    if (p > 0) return `${p}€/h en grupo`;
  }
  return null;
}

/** Precios individuales utilizables para calcular el rango "desde X € hasta Y €". */
export function preciosIndividuales(asignaturas) {
  return (asignaturas || [])
    .filter(daIndividual)
    .map(s => Number(s.price_per_hour))
    .filter(p => Number.isFinite(p) && p > 0);
}

/**
 * Plazas de una reserva de grupo. Devuelve null si no tiene tope.
 *
 * Las reservas creadas antes del grupo indefinido llevan siempre max_students con un número,
 * así que el `|| 4` de antes seguía valiendo para ellas; lo que no se puede es aplicarlo a una
 * reserva sin tope, porque la cerraría al cuarto alumno.
 */
export function plazasReserva(reserva) {
  if (!reserva) return 0;
  if (reserva.group_unlimited === true) return null;
  const max = parseInt(reserva.max_students);
  return Number.isFinite(max) && max >= 2 ? max : 4;
}

export function reservaCompleta(reserva) {
  const plazas = plazasReserva(reserva);
  if (plazas === null) return false;
  return (reserva?.enrolled_students?.length || 0) >= plazas;
}

/** Una asignatura está bien configurada si ofrece al menos un tipo de clase con precio. */
export function asignaturaCompleta(asignatura) {
  if (!asignatura) return false;
  const individualOk = daIndividual(asignatura) && Number(asignatura.price_per_hour) > 0;
  if (!daGrupal(asignatura)) return individualOk;
  const grupalOk = grupoIndefinido(asignatura)
    ? Number(asignatura.group_price_per_person) > 0
    : Object.values(asignatura.group_prices || {}).some(v => Number(v) > 0);
  if (daIndividual(asignatura)) return individualOk && grupalOk;
  return grupalOk;
}
