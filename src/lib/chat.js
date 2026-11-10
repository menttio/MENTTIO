import { base44 } from '@/api/base44Client';

// Lote F (10/11/2026): conversaciones y mensajes se escriben solo en el servidor (chatActions),
// que comprueba que quien escribe es parte de la conversacion y que un profesor solo abre chat
// con sus alumnos.
export async function chatAccion(accion, datos = {}) {
  try {
    const res = await base44.functions.invoke('chatActions', { accion, ...datos });
    if (res?.data?.error) throw new Error(res.data.error);
    return res?.data || {};
  } catch (e) {
    throw new Error(e?.response?.data?.error || e?.message || 'No se ha podido enviar');
  }
}
