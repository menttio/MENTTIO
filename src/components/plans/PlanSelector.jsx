import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * El pago anual se anunciaba en la letra pequeña ("130€ al año si pagas anual") pero no había
 * forma de contratarlo: el servidor aceptaba `billing_period`, y nadie se lo enviaba nunca.
 * Aquí está el interruptor que faltaba.
 *
 * Los dos planes de suscripción salen a diez mensualidades al año, así que el ahorro son
 * exactamente dos meses. Los 14 días de prueba solo aplican al pago mensual: en el anual se
 * cobra el año completo desde el principio.
 */
const plans = [
  {
    id: 'basic',
    name: 'Esencial',
    mensual: '12,99€/mes',
    anual: '130€/año',
    ahorroAnual: 'Ahorras 25,88€',
    trial: '14 días gratis',
    description: 'Todo salvo la grabación',
    features: ['Reservas y calendario', 'Materiales y mensajes', 'Seguimiento e informes a familias'],
    color: 'border-[#41f2c0]',
    badge: null,
  },
  {
    id: 'premium',
    name: 'Completo',
    mensual: '29,99€/mes',
    anual: '300€/año',
    ahorroAnual: 'Ahorras 59,88€',
    trial: '14 días gratis',
    description: 'La clase se graba y tu alumno la repasa',
    features: ['Todo lo del plan Esencial', 'Grabación de las clases', 'Soporte prioritario'],
    color: 'border-yellow-400',
    badge: 'Recomendado',
  },
  {
    id: 'commission',
    name: 'Sin cuota',
    mensual: '0€/mes + 10% por clase',
    anual: '0€/mes + 10% por clase',
    ahorroAnual: null,
    trial: null,
    description: 'Para empezar sin arriesgar nada',
    features: ['Sin pago mensual', 'Solo pagas si cobras por la plataforma', 'Sin grabación de clases'],
    color: 'border-purple-400',
    badge: null,
  },
];

export default function PlanSelector({ selected, onChange, periodo = 'mensual', onPeriodoChange }) {
  const esAnual = periodo === 'anual';
  const planSeleccionado = plans.find((p) => p.id === selected);
  const admiteAnual = planSeleccionado ? planSeleccionado.id !== 'commission' : true;

  return (
    <div className="space-y-4">
      {onPeriodoChange && (
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Forma de pago">
            <button
              type="button"
              onClick={() => onPeriodoChange('mensual')}
              aria-pressed={!esAnual}
              className={cn(
                'px-4 py-1.5 text-sm rounded-lg transition-colors',
                !esAnual ? 'bg-white shadow-sm font-semibold text-[#404040]' : 'text-gray-500'
              )}
            >
              Pago mensual
            </button>
            <button
              type="button"
              onClick={() => onPeriodoChange('anual')}
              aria-pressed={esAnual}
              className={cn(
                'px-4 py-1.5 text-sm rounded-lg transition-colors',
                esAnual ? 'bg-white shadow-sm font-semibold text-[#404040]' : 'text-gray-500'
              )}
            >
              Pago anual
              <span className="ml-1.5 text-xs font-bold text-[#0d7a5f]">−2 meses</span>
            </button>
          </div>
          {esAnual && (
            <p className="text-xs text-gray-500 text-center">
              Pagando un año entero te salen dos meses gratis. En el pago anual se cobra el año
              completo al contratar, sin los 14 días de prueba.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {plans.map((plan) => {
          const anualAqui = esAnual && plan.id !== 'commission';
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange(plan.id)}
              className={cn(
                'relative text-left w-full border-2 rounded-xl p-4 transition-all',
                selected === plan.id
                  ? `${plan.color} bg-gray-50 shadow-md`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {plan.badge && (
                <span className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  selected === plan.id ? 'border-[#41f2c0] bg-[#41f2c0]' : 'border-gray-300'
                )}>
                  {selected === plan.id && <Check className="text-[#404040]" size={12} aria-hidden="true" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-[#404040]">{plan.name}</span>
                    <span className="text-sm font-bold text-[#404040]">
                      {anualAqui ? plan.anual : plan.mensual}
                    </span>
                    {anualAqui && plan.ahorroAnual ? (
                      <span className="text-xs text-[#0d7a5f] font-semibold">· {plan.ahorroAnual}</span>
                    ) : (
                      plan.trial && <span className="text-xs text-green-700 font-medium">· {plan.trial}</span>
                    )}
                  </div>
                  {esAnual && plan.id === 'commission' && (
                    <p className="text-xs text-gray-500 mt-0.5">Este plan no tiene cuota, así que no cambia</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="text-[#0d7a5f]" aria-hidden="true">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {esAnual && !admiteAnual && (
        <p className="text-xs text-gray-500 text-center">
          El plan sin cuota no se paga por adelantado: se cobra un 10 % de cada clase.
        </p>
      )}
    </div>
  );
}
