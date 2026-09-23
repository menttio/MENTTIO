import React from 'react';
import { ShieldCheck, CalendarCheck, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Repasa la clase cuando quieras',
    description: 'Si tu profesor graba la clase, la tendrás disponible para volver a verla antes del examen, las veces que haga falta.',
    color: 'bg-[#41f2c0]/10 text-[#0d7a5f]',
  },
  {
    icon: CalendarCheck,
    title: 'Reserva sin mensajes ni esperas',
    description: 'Ves los huecos libres de tu profesor y eliges el que te venga bien. Sin cadenas de WhatsApp para cuadrar la hora.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Lock,
    title: 'Apuntes y pagos en un solo sitio',
    description: 'El material de cada clase queda guardado y los pagos se hacen con tarjeta de forma segura mediante Stripe.',
    color: 'bg-blue-100 text-blue-600',
  },
];

export default function StudentSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#41f2c0]/15 text-[#0d7a5f] text-sm font-semibold rounded-full mb-4">
Para tus alumnos y sus familias
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#404040] mb-4">
Tu alumno no vuelve a perderse una explicación
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
Tus alumnos entran con su cuenta, reservan en tus horarios, encuentran los apuntes de cada clase y pueden volver a ver la grabación. Las familias ven que hay un método detrás.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className={`w-14 h-14 rounded-xl ${benefit.color} flex items-center justify-center mx-auto mb-4`}>
                <benefit.icon size={26} />
              </div>
              <h3 className="font-bold text-[#404040] text-lg mb-2">{benefit.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to={createPageUrl('StudentSignup')}
            className="inline-block px-8 py-4 bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold rounded-xl text-lg transition-colors shadow-lg shadow-[#41f2c0]/30"
          >
            Encontrar mi profesor
          </Link>
        </div>
      </div>
    </section>
  );
}