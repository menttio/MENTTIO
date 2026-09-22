import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    id: 'basic',
    name: 'Esencial',
    price: '12,99€/mes',
    trial: '14 días gratis',
    description: 'Todo salvo la grabación',
    features: ['Reservas y calendario', 'Materiales y mensajes', 'Seguimiento e informes a familias'],
    color: 'border-[#41f2c0]',
    badge: null,
  },
  {
    id: 'premium',
    name: 'Clase grabada',
    price: '29,99€/mes',
    trial: '14 días gratis',
    description: 'La clase se graba y tu alumno la repasa',
    features: ['Todo lo del plan Esencial', 'Grabación automática de las clases', 'Correo profesional @menttio.com'],
    color: 'border-yellow-400',
    badge: 'Recomendado',
  },
  {
    id: 'commission',
    name: 'Sin cuota',
    price: '0€/mes + 10% por clase',
    trial: null,
    description: 'Para empezar sin arriesgar nada',
    features: ['Sin pago mensual', 'Solo pagas si cobras por la plataforma', 'Sin grabación de clases'],
    color: 'border-purple-400',
    badge: null,
  },
];

export default function PlanSelector({ selected, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {plans.map((plan) => (
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
              {selected === plan.id && <Check className="text-white" size={12} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-[#404040]">{plan.name}</span>
                <span className="text-sm font-bold text-[#404040]">{plan.price}</span>
                {plan.trial && (
                  <span className="text-xs text-green-600 font-medium">· {plan.trial}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              <ul className="mt-2 space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="text-[#41f2c0]">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}