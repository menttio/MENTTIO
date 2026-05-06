import React from 'react';
import { Check, Sparkles, Crown, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { createPageUrl } from '../../utils';

const teacherPlans = [
  {
    id: 'comision',
    icon: Zap,
    name: 'Plan Comisión',
    badge: null,
    price: '0€',
    period: '/mes',
    description: 'Empieza sin coste fijo',
    note: '25% de comisión por clase · tú te quedas el 75%',
    cardClass: 'bg-white border-2 border-gray-100 hover:border-[#41f2c0]',
    iconClass: 'bg-gray-100',
    iconColor: 'text-[#404040]',
    priceColor: 'text-[#404040]',
    textColor: 'text-gray-700',
    mutedColor: 'text-gray-500',
    checkBg: 'bg-[#41f2c0]/20',
    checkColor: 'text-[#41f2c0]',
    ctaClass: 'bg-[#404040] hover:bg-[#303030] text-white',
    ctaLabel: 'Empezar gratis',
    features: [
      { text: 'Gestión automática de reservas', included: true },
      { text: 'Calendario inteligente', included: true },
      { text: 'Chat con alumnos ilimitado', included: true },
      { text: 'Procesamiento de pagos integrado', included: true },
      { text: 'Notificaciones en tiempo real', included: true },
      { text: 'Sin cuota mensual', included: true },
      { text: 'Grabación de clases en la nube', included: false },
      { text: 'Soporte estándar', included: true },
    ],
  },
  {
    id: 'basico',
    icon: Sparkles,
    name: 'Plan Básico',
    badge: 'Más popular',
    price: '14,99€',
    period: '/mes',
    description: '14 días gratis, sin compromiso',
    note: 'Sin comisiones por clase',
    cardClass: 'bg-[#404040] border-2 border-[#404040] scale-105 shadow-2xl',
    iconClass: 'bg-[#41f2c0]',
    iconColor: 'text-white',
    priceColor: 'text-white',
    textColor: 'text-white',
    mutedColor: 'text-white/70',
    checkBg: 'bg-[#41f2c0]/40',
    checkColor: 'text-white',
    ctaClass: 'bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold',
    ctaLabel: 'Empezar 14 días gratis',
    features: [
      { text: 'Gestión automática de reservas', included: true },
      { text: 'Calendario inteligente', included: true },
      { text: 'Chat con alumnos ilimitado', included: true },
      { text: 'Procesamiento de pagos automático', included: true },
      { text: 'Notificaciones en tiempo real', included: true },
      { text: 'Sin comisiones por clase', included: true },
      { text: 'Grabación de clases en la nube', included: false },
      { text: 'Soporte estándar', included: true },
    ],
  },
  {
    id: 'premium',
    icon: Crown,
    name: 'Plan Premium',
    badge: null,
    price: '36,99€',
    period: '/mes',
    description: 'Todo incluido',
    note: 'Sin comisiones por clase',
    cardClass: 'bg-gradient-to-br from-[#41f2c0] to-[#2ab88f] border-2 border-[#41f2c0]',
    iconClass: 'bg-white/20',
    iconColor: 'text-white',
    priceColor: 'text-white',
    textColor: 'text-white',
    mutedColor: 'text-white/80',
    checkBg: 'bg-[#404040]/30',
    checkColor: 'text-white',
    ctaClass: 'bg-white hover:bg-gray-100 text-[#2ab88f] font-bold',
    ctaLabel: 'Comenzar ahora',
    features: [
      { text: 'Gestión automática de reservas', included: true },
      { text: 'Calendario inteligente', included: true },
      { text: 'Chat con alumnos ilimitado', included: true },
      { text: 'Procesamiento de pagos automático', included: true },
      { text: 'Notificaciones en tiempo real', included: true },
      { text: 'Sin comisiones por clase', included: true },
      { text: 'Grabación de clases en la nube', included: true },
      { text: 'Soporte premium 24/7', included: true },
    ],
  },
];

export default function Pricing() {
  const handleGetStartedStudent = () => {
    window.location.href = createPageUrl('SelectRole') + '?role=student';
  };

  const handleGetStartedTeacher = () => {
    window.location.href = createPageUrl('TeacherSignup');
  };

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Precios transparentes y justos
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Los profesores pagan solo por lo que usan.
          </p>
        </motion.div>

        {/* Student callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
            <div className="w-8 h-8 bg-[#41f2c0] rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="text-gray-700 font-medium">Para alumnos es siempre <span className="text-[#41f2c0] font-bold">gratis</span></span>
            <button
              onClick={handleGetStartedStudent}
              className="text-sm text-[#404040] font-semibold underline underline-offset-2 hover:text-[#41f2c0] transition-colors"
            >
              Regístrate →
            </button>
          </div>
        </motion.div>

        {/* Teacher plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
          {teacherPlans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, scale: plan.id === 'basico' ? 1.08 : 1.04 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, hover: { type: 'spring', stiffness: 300, damping: 22, delay: 0 } }}
                className={`relative rounded-3xl p-7 ${plan.cardClass} cursor-pointer`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#41f2c0] text-[#404040] text-xs font-bold px-4 py-1 rounded-full shadow">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 ${plan.iconClass} rounded-xl flex items-center justify-center`}>
                    <Icon className={plan.iconColor} size={22} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${plan.textColor}`}>{plan.name}</h3>
                    <p className={`text-xs ${plan.mutedColor}`}>{plan.description}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.priceColor}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.mutedColor}`}>{plan.period}</span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.mutedColor}`}>{plan.note}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 ${feature.included ? plan.checkBg : 'bg-red-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                        {feature.included
                          ? <Check className={plan.checkColor} size={12} />
                          : <X className="text-red-400" size={12} />
                        }
                      </div>
                      <span className={`text-sm ${feature.included ? plan.textColor : (plan.id === 'comision' ? 'text-gray-400 line-through' : 'text-white/40 line-through')}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleGetStartedTeacher}
                  className={`w-full py-5 text-sm rounded-xl ${plan.ctaClass}`}
                >
                  {plan.ctaLabel}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-gray-500 text-sm">
            ¿Dudas sobre los precios?{' '}
            <a href="/Contact" className="text-[#41f2c0] font-semibold hover:underline">
              Contáctanos
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
