/**
 * Reglas de las reseñas, en un solo sitio.
 *
 * Una reseña vale lo que vale su procedencia. Hasta ahora las tres fuentes se pintaban
 * igual, asi que una opinion recogida a mano en un formulario parecia lo mismo que una
 * escrita por un alumno despues de una clase dada en la plataforma. Eso es justo lo que
 * hace que nadie se crea las reseñas de ninguna web de profesores.
 *
 * El profesor no puede escribir reseñas de si mismo: las crea siempre el backend
 * (funcion crearResena), que es el unico que puede comprobar quien es el que escribe.
 *
 * Cuidado: la entidad Review es de lectura publica (la portada las enseña sin iniciar
 * sesion). No se guarda en ella el nombre completo ni el email de ningun alumno.
 */

export const MAX_COMENTARIO = 600;

export const FUENTES = {
  plataforma: {
    etiqueta: 'Clase verificada',
    detalle:
      'La escribio un alumno registrado en Menttio despues de una clase dada en la plataforma.',
    verificada: true,
    tono: 'bg-[#41f2c0] text-[#404040]',
  },
  invitacion: {
    etiqueta: 'Alumno verificado',
    detalle:
      'La escribio un alumno con cuenta en Menttio al que invito su profesor. La clase fue fuera de la plataforma.',
    verificada: true,
    tono: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  formulario: {
    etiqueta: 'Recogida por el profesor',
    detalle:
      'Opinion recogida fuera de Menttio con permiso del alumno. Menttio no ha podido comprobar quien la escribio.',
    verificada: false,
    tono: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
};

// Las reseñas antiguas no traen source. Se dieron de alta a mano, asi que son formulario.
export function fuenteResena(resena) {
  const clave = resena?.source;
  return FUENTES[clave] ? clave : 'formulario';
}

export function infoFuente(resena) {
  return FUENTES[fuenteResena(resena)];
}

export function esVerificada(resena) {
  return infoFuente(resena).verificada === true;
}

/**
 * Media de estrellas. Solo cuentan las reseñas verificadas que de verdad pusieron nota:
 * las de formulario no se pueden comprobar y muchas llegaron sin puntuacion, asi que
 * sumarlas como ceros daba medias de 0,0 a profesores con reseñas buenas.
 *
 * Devuelve media = null cuando no hay ninguna nota. Quien lo pinte tiene que enseñar
 * "sin valoraciones", nunca un 5,0 de relleno.
 */
export function mediaValoracion(resenas) {
  const lista = Array.isArray(resenas) ? resenas : [];
  const puntuadas = lista.filter((r) => esVerificada(r) && Number(r.rating) > 0);
  if (puntuadas.length === 0) {
    return { media: null, puntuadas: 0, total: lista.length, verificadas: lista.filter(esVerificada).length };
  }
  const suma = puntuadas.reduce((acc, r) => acc + Number(r.rating), 0);
  return {
    media: suma / puntuadas.length,
    puntuadas: puntuadas.length,
    total: lista.length,
    verificadas: lista.filter(esVerificada).length,
  };
}

// Texto para el hueco de la nota media cuando todavia no hay ninguna.
export function textoSinNota(resenas) {
  const total = Array.isArray(resenas) ? resenas.length : 0;
  if (total === 0) return 'Todavia sin reseñas';
  return `${total} ${total === 1 ? 'reseña' : 'reseñas'} sin puntuar`;
}
