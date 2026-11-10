import { base44 } from '@/api/base44Client';

// Lote E3 (10/11/2026): la ficha del profesor ya no se escribe desde el navegador. Pasa por la
// funcion teacherAccount, que solo acepta datos de perfil: el plan, la comision, la prueba, la
// exencion, Stripe y la verificacion los decide siempre el servidor.
async function llamar(datos) {
  try {
    const res = await base44.functions.invoke('teacherAccount', datos);
    if (res?.data?.error) throw new Error(res.data.error);
    return res?.data?.teacher || null;
  } catch (e) {
    throw new Error(e?.response?.data?.error || e?.message || 'No se ha podido guardar el perfil');
  }
}

export const actualizarProfesor = (id, campos) => llamar({ accion: 'actualizar', id, campos });

export const crearProfesor = (datos) => llamar({ accion: 'crear', perfil: datos, plan: datos?.subscription_plan });

export const elegirPlanComision = () => llamar({ accion: 'elegir_comision' });
