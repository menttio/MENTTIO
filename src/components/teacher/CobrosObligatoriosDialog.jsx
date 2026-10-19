import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '../../utils';

const CLAVE = 'menttio_aviso_cobros_visto';

/**
 * Aviso bloqueante para el profesor del plan sin cuota que todavía no tiene los cobros activos.
 *
 * En ese plan las clases se pagan sólo con tarjeta, porque es la única forma de retener el 10%
 * en el momento del cobro, y por eso no hay cuota mensual. Sin los cobros activos el profesor
 * no aparece como reservable: su cuenta está viva pero no sirve para nada. Más vale que se
 * entere al entrar que por un alumno diciéndole que no puede reservarle.
 *
 * No tiene aspa ni se cierra tocando fuera: la única salida es el botón.
 *
 * Pero se muestra UNA VEZ POR SESIÓN, no en cada página. Dar de alta los cobros exige
 * documento de identidad y cuenta bancaria, y no siempre se puede terminar en ese momento. Un
 * aviso que reaparece sin descanso dejaría al profesor encerrado en su propia cuenta sin poder
 * ni mirar su calendario, que es pasarse de la raya para algo que ya está avisado.
 */
export default function CobrosObligatoriosDialog({ teacher }) {
  const [visible, setVisible] = useState(false);

  const procede =
    teacher?.subscription_plan === 'commission' && !teacher?.stripe_connect_enabled;

  useEffect(() => {
    if (!procede) return;
    let yaVisto = false;
    try { yaVisto = sessionStorage.getItem(CLAVE) === 'true'; } catch (_e) { /* modo privado */ }
    if (!yaVisto) setVisible(true);
  }, [procede]);

  if (!visible) return null;

  const ir = () => {
    try { sessionStorage.setItem(CLAVE, 'true'); } catch (_e) { /* modo privado */ }
    // Directo a la pestaña de datos de pago, no al perfil a secas: ver pestanaInicial en Profile.
    window.location.href = `${createPageUrl('Profile')}?tab=pago`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cobros"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-[#41f2c0]/25 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <AlertTriangle size={20} className="text-[#0d7a5f]" />
          </span>
          <div>
            <h2 id="titulo-cobros" className="font-bold text-[#404040] text-lg leading-tight">
              Te falta configurar los cobros
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Plan sin cuota mensual</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-3">
          En tu plan las clases se cobran con tarjeta: es así como se aplica el 10 % y por eso
          no pagas cuota todos los meses.
        </p>
        <p className="text-gray-600 text-sm mb-6">
          <strong className="text-[#404040]">Hasta que no lo actives, tus alumnos no pueden
          reservarte.</strong> Se tarda unos minutos y hace falta tu cuenta bancaria.
        </p>

        <Button
          onClick={ir}
          className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold"
        >
          <CreditCard size={18} className="mr-2" />
          Configurar los cobros
        </Button>
      </div>
    </div>
  );
}
