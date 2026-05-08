import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const rows = [
  {
    feature: 'Reservas de clase',
    without: 'WhatsApps de ida y vuelta',
    with: 'Formulario automático 24/7',
  },
  {
    feature: 'Agenda y calendario',
    without: 'Excel o papel, actualización manual',
    with: 'Calendario inteligente, sin solapamientos',
  },
  {
    feature: 'Cobro de clases',
    without: 'Transferencia o Bizum manual sin control',
    with: 'Stripe o Bizum integrado, registro automático',
  },
  {
    feature: 'Materiales del alumno',
    without: 'Email, Drive desordenado o WhatsApp',
    with: 'Biblioteca centralizada por alumno y asignatura',
  },
  {
    feature: 'Grabaciones',
    without: 'No existen o en Drive disperso',
    with: 'Automáticas y accesibles desde la plataforma',
  },
  {
    feature: 'Recordatorios y avisos',
    without: 'Mensajes manuales uno a uno',
    with: 'Notificaciones automáticas para todos',
  },
  {
    feature: 'Control de pagos pendientes',
    without: 'Anotaciones en papel o memoria',
    with: 'Panel de pagos en tiempo real',
  },
];

export default function Comparison() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-[#41f2c0]/10 text-[#2ab88f] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Antes vs. después
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#404040] mb-4">
            ¿Cómo gestionas tus clases ahora?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            La mayoría de profesores particulares combinan WhatsApp, Excel y transferencias bancarias. Funciona hasta que no funciona.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
        >
          {/* Header */}
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
            <div className="py-4 px-5 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Aspecto
            </div>
            <div className="py-4 px-5 text-sm font-semibold text-gray-500 uppercase tracking-wide border-l border-gray-200">
              Sin Menttio
            </div>
            <div className="py-4 px-5 text-sm font-semibold uppercase tracking-wide border-l border-[#41f2c0]/40 bg-[#41f2c0]/5 text-[#2ab88f]">
              Con Menttio
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-3 border-b border-gray-100 last:border-0 ${
                idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              <div className="py-4 px-5 text-sm font-medium text-[#404040] flex items-center">
                {row.feature}
              </div>
              <div className="py-4 px-5 border-l border-gray-100 flex items-start gap-2.5">
                <X className="text-red-400 flex-shrink-0 mt-0.5" size={15} />
                <span className="text-sm text-gray-500">{row.without}</span>
              </div>
              <div className="py-4 px-5 border-l border-[#41f2c0]/30 bg-[#41f2c0]/5 flex items-start gap-2.5">
                <Check className="text-[#2ab88f] flex-shrink-0 mt-0.5" size={15} />
                <span className="text-sm font-medium text-[#404040]">{row.with}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
