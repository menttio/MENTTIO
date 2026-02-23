import React, { useState } from 'react';
import { Check, Sparkles, Crown, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';

export default function Pricing() {
  const [activeTeacherPlan, setActiveTeacherPlan] = useState('premium'); // premium por defecto

  const handleGetStartedStudent = () => {
    window.location.href = createPageUrl('SelectRole') + '?role=student';
  };

  const handleGetStartedTeacher = () => {
    window.location.href = createPageUrl('TeacherSignup');
  };

  const switchPlan = () => {
    setActiveTeacherPlan(prev => prev === 'premium' ? 'basic' : 'premium');
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto items-center">
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
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-5 md:py-6 text-base md:text-lg rounded-xl"
            >
              Empezar gratis
            </Button>
          </motion.div>

          {/* Teacher Plans - Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative h-[700px] lg:h-[750px]"
          >
            {/* Switch Button */}
            <button
              onClick={switchPlan}
              className="absolute top-1/2 -translate-y-1/2 -right-6 z-20 w-12 h-12 bg-[#41f2c0] hover:bg-[#35d4a7] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronRight className="text-white" size={24} />
            </button>

            <AnimatePresence mode="wait">
              {/* Premium Plan - Front */}
              {activeTeacherPlan === 'premium' && (
                <>
                  <motion.div
                    key="premium-front"
                    initial={{ x: 100, opacity: 0, scale: 0.9, rotateY: -10 }}
                    animate={{ x: 0, opacity: 1, scale: 1, rotateY: 0, zIndex: 10 }}
                    exit={{ x: -100, opacity: 0, scale: 0.9, rotateY: 10 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] rounded-3xl shadow-2xl p-8 border-2 border-[#41f2c0] overflow-hidden"
                  >
                    <div className="absolute -top-2 -right-2 bg-[#404040] text-white px-6 py-2 rounded-bl-2xl rounded-tr-2xl flex items-center gap-2 shadow-lg">
                      <Crown size={16} />
                      <span className="text-sm font-semibold">Más popular</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Crown className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Plan Premium</h3>
                        <p className="text-white/80">Para profesores</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white">19,99€</span>
                        <span className="text-white/80">/mes</span>
                      </div>
                      <p className="text-sm text-white/80 mt-2">Todas las funcionalidades</p>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {[
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
                      className="w-full bg-white hover:bg-gray-100 text-[#41f2c0] py-5 md:py-6 text-base md:text-lg rounded-xl font-semibold shadow-xl"
                    >
                      Comenzar ahora
                    </Button>
                  </motion.div>

                  {/* Basic Plan - Back */}
                  <motion.div
                    key="basic-back"
                    initial={{ x: 50, opacity: 0.3, scale: 0.85 }}
                    animate={{ x: 30, opacity: 0.4, scale: 0.9, zIndex: 5 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-200 pointer-events-none"
                    style={{ transform: 'translateX(30px)' }}
                  />
                </>
              )}

              {/* Basic Plan - Front */}
              {activeTeacherPlan === 'basic' && (
                <>
                  <motion.div
                    key="basic-front"
                    initial={{ x: 100, opacity: 0, scale: 0.9, rotateY: -10 }}
                    animate={{ x: 0, opacity: 1, scale: 1, rotateY: 0, zIndex: 10 }}
                    exit={{ x: -100, opacity: 0, scale: 0.9, rotateY: 10 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-100 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center">
                        <Crown className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[#404040]">Plan Básico</h3>
                        <p className="text-gray-500">Para profesores</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-[#404040]">14,99€</span>
                        <span className="text-gray-500">/mes</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Funcionalidades esenciales</p>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {[
                        { text: 'Gestión automática de reservas', included: true },
                        { text: 'Calendario inteligente', included: true },
                        { text: 'Grabación de clases en la nube', included: false },
                        { text: 'Chat con alumnos ilimitado', included: true },
                        { text: 'Estadísticas y análisis detallados', included: true },
                        { text: 'Procesamiento de pagos automático', included: true },
                        { text: 'Notificaciones en tiempo real', included: true },
                        { text: 'Sin comisiones por clase', included: true },
                        { text: 'Soporte estándar', included: true }
                      ].map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            feature.included ? 'bg-gray-100' : 'bg-red-50'
                          }`}>
                            {feature.included ? (
                              <Check className="text-gray-600" size={14} />
                            ) : (
                              <X className="text-red-400" size={14} />
                            )}
                          </div>
                          <span className={feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      onClick={handleGetStartedTeacher}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-5 md:py-6 text-base md:text-lg rounded-xl"
                    >
                      Comenzar ahora
                    </Button>
                  </motion.div>

                  {/* Premium Plan - Back */}
                  <motion.div
                    key="premium-back"
                    initial={{ x: 50, opacity: 0.3, scale: 0.85 }}
                    animate={{ x: 30, opacity: 0.4, scale: 0.9, zIndex: 5 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] rounded-3xl shadow-lg p-8 border-2 border-[#41f2c0] pointer-events-none"
                    style={{ transform: 'translateX(30px)' }}
                  />
                </>
              )}
            </AnimatePresence>
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
            ¿Dudas sobre los precios? <a href="/Contact" className="text-[#41f2c0] font-semibold hover:underline">Contáctanos</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}