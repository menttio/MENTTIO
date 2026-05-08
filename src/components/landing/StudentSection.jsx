import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, BookOpen, MessageCircle, Video, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  {
    icon: Calendar,
    title: 'Reserva en segundos',
    description: 'Elige profesor, asignatura y horario disponible. Sin llamadas ni esperas.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Materiales siempre a mano',
    description: 'Accede a los apuntes y ejercicios que tu profesor sube antes y después de cada clase.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Video,
    title: 'Clases grabadas',
    description: 'Si tu profesor tiene plan Premium, repasa la clase grabada todas las veces que necesites.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat directo con tu profesor',
    description: 'Resuelve dudas entre clases sin intercambiar números de teléfono.',
    color: 'bg-[#41f2c0]/20 text-[#2ab88f]',
  },
];

export default function StudentSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#41f2c0]/10 text-[#2ab88f] text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              <Sparkles size={14} />
              Para alumnos — siempre gratis
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#404040] mb-5 leading-tight">
              Tus clases particulares,<br />
              <span className="text-[#41f2c0]">todo en un solo lugar</span>
            </h2>

            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              Olvídate de buscar el PDF que te mandaron por WhatsApp o de no recordar a qué hora era la clase. En Menttio tienes todo organizado desde el móvil.
            </p>

            <Link to={createPageUrl('StudentSignup')}>
              <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white px-6 py-3 text-base gap-2">
                Regístrate gratis como alumno
                <ArrowRight size={16} />
              </Button>
            </Link>

            <p className="text-xs text-gray-400 mt-3">
              Sin tarjeta de crédito. Sin coste nunca.
            </p>
          </motion.div>

          {/* Right: benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${b.color}`}>
                  <b.icon size={20} />
                </div>
                <h3 className="font-semibold text-[#404040] mb-1">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
