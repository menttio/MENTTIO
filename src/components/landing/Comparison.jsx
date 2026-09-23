import React from 'react';
import { X, Check } from 'lucide-react';

const withoutItems = [
  'Crear la videollamada y mandar el enlace a mano, clase tras clase',
  'La explicación se pierde: si el alumno no lo pilló, se repite en la siguiente',
  'Reenviar los mismos apuntes por WhatsApp una y otra vez',
  'Perseguir los pagos y llevar la cuenta de memoria',
  'Cuadrar horarios a base de mensajes',
];

const withItems = [
  'La videollamada se crea sola y el alumno recibe el enlace',
  'La clase queda grabada y el alumno la repasa antes del examen',
  'Los apuntes viven junto a la clase a la que pertenecen',
  'El alumno paga al reservar y ves al instante quién debe qué',
  'Tus huecos libres, visibles: el alumno elige y se acabó',
];

export default function Comparison() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#404040] mb-4">
            La diferencia es clara
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
Lo que cambia en el día a día de un profesor particular online
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sin Menttio */}
          <div className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden shadow-sm">
            <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <X className="text-red-500" size={18} />
              </div>
              <h3 className="font-bold text-gray-700 text-lg">Sin Menttio</h3>
            </div>
            <ul className="p-6 space-y-4">
              {withoutItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="text-red-500" size={12} />
                  </div>
                  <span className="text-gray-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Con Menttio */}
          <div className="bg-white rounded-2xl border-2 border-[#41f2c0]/40 overflow-hidden shadow-sm">
            <div className="bg-[#41f2c0]/10 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                <Check className="text-[#0d7a5f]" size={18} />
              </div>
              <h3 className="font-bold text-[#404040] text-lg">Con Menttio</h3>
            </div>
            <ul className="p-6 space-y-4">
              {withItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#41f2c0]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="text-[#0d7a5f]" size={12} />
                  </div>
                  <span className="text-[#404040] font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}