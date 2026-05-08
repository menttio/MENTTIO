import React from 'react';
import { ShieldCheck, CalendarCheck, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Profesores verificados',
    description: 'Todos nuestros profesores pasan por un proceso de verificación para garantizar calidad y seguridad.',
    color: 'bg-[#41f2c0]/10 text-[#35d4a7]',
  },
  {
    icon: CalendarCheck,
    title: 'Reserva fácil en segundos',
    description: 'Elige tu profesor, selecciona horario y confirma tu clase en pocos pasos, sin llamadas ni esperas.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Lock,
    title: 'Pagos seguros y protegidos',
    description: 'Tus datos de pago están protegidos con la tecnología de Stripe, el estándar de seguridad del sector.',
    color: 'bg-blue-100 text-blue-600',
  },
];

export default function StudentSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#41f2c0]/15 text-[#35d4a7] text-sm font-semibold rounded-full mb-4">
            Para alumnos y familias
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#404040] mb-4">
            ¿Buscas el profesor perfecto?
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Encuentra al profesor ideal para tus necesidades, reserva clases en segundos y paga de forma segura. Todo en un solo lugar.
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
            className="inline-block px-8 py-4 bg-[#41f2c0] hover:bg-[#35d4a7] text-white font-semibold rounded-xl text-lg transition-colors shadow-lg shadow-[#41f2c0]/30"
          >
            Encontrar mi profesor
          </Link>
        </div>
      </div>
    </section>
  );
}