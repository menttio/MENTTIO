import React from 'react';
import { X, Check } from 'lucide-react';

const withoutItems = [
  'Gestión manual de pagos y cobros',
  'Alumnos perdidos por falta de seguimiento',
  'Horarios desorganizados en papel o Excel',
  'Sin historial de clases ni progreso',
  'Comunicación caótica por WhatsApp',
];

const withItems = [
  'Cobros automáticos y seguimiento de pagos',
  'Recordatorios automáticos para tus alumnos',
  'Calendario integrado y siempre actualizado',
  'Historial completo de clases y progreso',
  'Plataforma centralizada de comunicación',
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
            Compara cómo trabajan los profesores particulares con y sin Menttio
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
                <Check className="text-[#35d4a7]" size={18} />
              </div>
              <h3 className="font-bold text-[#404040] text-lg">Con Menttio</h3>
            </div>
            <ul className="p-6 space-y-4">
              {withItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#41f2c0]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="text-[#35d4a7]" size={12} />
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