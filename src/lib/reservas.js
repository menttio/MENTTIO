import { base44 } from '@/api/base44Client';

// Lote E2 (10/11/2026): las reservas ya no se escriben desde el navegador. Toda escritura pasa
// por la funcion bookingActions, que comprueba quien la pide y monta los datos en el servidor.
// Lanza un Error con el mensaje del servidor para que cada pantalla lo pueda ensenar.
export async function accionReserva(accion, datos = {}) {
  try {
    const res = await base44.functions.invoke('bookingActions', { accion, ...datos });
    if (res?.data?.error) throw new Error(res.data.error);
    return res?.data || {};
  } catch (e) {
    throw new Error(e?.response?.data?.error || e?.message || 'No se ha podido guardar el cambio');
  }
}
