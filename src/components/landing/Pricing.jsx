import React from 'react';
import { Check, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';

export default function Pricing() {
  const handleGetStartedStudent = () => {
    base44.auth.redirectToLogin(createPageUrl('SelectRole') + '?role=student');
  };

  const handleGetStartedTeacher = () => {
    base44.auth.redirectToLogin(createPageUrl('TeacherSignup'));
  };

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Precios transparentes y justos
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Para alumnos es gratis. Los profesores pagan solo por lo que usan.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Student Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-100 hover:border-[#41f2c0] transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#404040]">Para Alumnos</h3>
                <p className="text-gray-500">Acceso completo</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-[#41f2c0]">0€</span>
                <span className="text-gray-500">/siempre</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Solo pagas las clases que tomes</p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                'Registro gratuito',
                'Búsqueda ilimitada de profesores',
                'Reserva de clases sin comisiones',
                'Acceso a grabaciones de tus clases',
                'Chat con profesores',
                'Almacenamiento de materiales',
                'Sin límite de clases',
                'Soporte prioritario'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="text-blue-500" size={14} />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={handleGetStartedStudent}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 text-lg rounded-xl"
            >
              Empezar gratis
            </Button>
          </motion.div>

          {/* Teacher Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] rounded-3xl shadow-2xl p-8 border-2 border-[#41f2c0] relative overflow-hidden"
          >
            {/* Popular badge */}
            <div className="absolute -top-2 -right-2 bg-[#404040] text-white px-6 py-2 rounded-bl-2xl rounded-tr-2xl flex items-center gap-2 shadow-lg">
              <Crown size={16} />
              <span className="text-sm font-semibold">Más popular</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Para Profesores</h3>
                <p className="text-white/80">Empieza a enseñar</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">20€</span>
                <span className="text-white/80">/mes</span>
              </div>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mt-3">
                <span className="text-sm text-white font-semibold">✨ Primer mes GRATIS</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                '30 días de prueba gratis',
                'Gestión automática de reservas',
                'Calendario inteligente',
                'Grabación de clases en la nube',
                'Chat con alumnos ilimitado',
                'Estadísticas y análisis detallados',
                'Procesamiento de pagos automático',
                'Notificaciones en tiempo real',
                'Sin comisiones por clase',
                'Soporte premium 24/7'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="text-[#41f2c0]" size={14} />
                  </div>
                  <span className="text-white font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={handleGetStartedTeacher}
              className="w-full bg-white hover:bg-gray-100 text-[#41f2c0] py-6 text-lg rounded-xl font-semibold shadow-xl"
            >
              Prueba gratis 30 días
            </Button>
            <p className="text-center text-white/70 text-xs mt-3">
              No se requiere tarjeta de crédito
            </p>
          </motion.div>
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-600">
            ¿Dudas sobre los precios? <button className="text-[#41f2c0] font-semibold hover:underline">Contáctanos</button>
          </p>
        </motion.div>
      </div>
    </section>
  );
}