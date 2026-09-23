import React, { useState } from 'react';
import { Check, Sparkles, Crown, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { createPageUrl } from '../../utils';

const teacherPlans = [
  {
    id: 'comision',
    icon: Zap,
    name: 'Sin cuota',
    badge: null,
    price: '0€',
    period: '/mes',
    description: 'Para empezar sin arriesgar nada',
    note: '10% por clase cobrada a través de Menttio',
    cardClass: 'bg-white border-2 border-gray-100 hover:border-[#41f2c0]',
    iconClass: 'bg-gray-100',
    iconColor: 'text-[#404040]',
    priceColor: 'text-[#404040]',
    textColor: 'text-gray-700',
    mutedColor: 'text-gray-500',
    checkBg: 'bg-[#41f2c0]/20',
    checkColor: 'text-[#41f2c0]',
    ctaClass: 'bg-[#404040] hover:bg-[#303030] text-white',
    ctaLabel: 'Empezar sin cuota',
    features: [
      { text: 'Reservas y calendario', included: true },
      { text: 'Materiales y mensajes con tus alumnos', included: true },
      { text: 'Cobro con tarjeta integrado', included: true },
      { text: 'Seguimiento del alumno', included: true },
      { text: 'Informe mensual para las familias', included: true },
      { text: 'Sin cuota fija', included: true },
      { text: 'Clases grabadas', included: false },
      { text: 'Soporte por correo', included: true },
    ],
  },
  {
    id: 'basico',
    icon: Sparkles,
    name: 'Esencial',
    badge: null,
    price: '12,99€',
    period: '/mes',
    priceAnual: '130€',
    periodAnual: '/año',
    noteAnual: 'Equivale a 10,83€ al mes · ahorras 25,88€',
    description: '14 días gratis, sin compromiso',
    note: 'Sin comisión por clase',
    cardClass: 'bg-white border-2 border-gray-100 hover:border-[#41f2c0]',
    iconClass: 'bg-[#41f2c0]/15',
    iconColor: 'text-[#0d7a5f]',
    priceColor: 'text-[#404040]',
    textColor: 'text-gray-700',
    mutedColor: 'text-gray-500',
    checkBg: 'bg-[#41f2c0]/20',
    checkColor: 'text-[#41f2c0]',
    ctaClass: 'bg-[#404040] hover:bg-[#303030] text-white',
    ctaLabel: 'Empezar 14 días gratis',
    features: [
      { text: 'Reservas y calendario', included: true },
      { text: 'Materiales y mensajes con tus alumnos', included: true },
      { text: 'Cobro con tarjeta integrado', included: true },
      { text: 'Seguimiento del alumno', included: true },
      { text: 'Informe mensual para las familias', included: true },
      { text: 'Sin comisión por clase', included: true },
      { text: 'Clases grabadas', included: false },
      { text: 'Soporte por correo', included: true },
    ],
  },
  {
    id: 'premium',
    icon: Crown,
    name: 'Completo',
    badge: 'El que marca la diferencia',
    price: '29,99€',
    period: '/mes',
    priceAnual: '300€',
    periodAnual: '/año',
    noteAnual: 'Equivale a 25€ al mes · ahorras 59,88€',
    description: 'Todo lo anterior, más la grabación',
    note: 'Sin comisión por clase',
    // Esta tarjeta era un degradado menta con el texto en blanco: contraste 1,42, el mismo
    // que corregimos en el resto del sitio. No salió en el escaneo porque axe no sabe medir
    // contraste sobre un degradado y se lo salta en silencio.
    //
    // Ahora va en el gris corporativo con texto blanco (10,4:1). Destaca más que antes
    // -es la única oscura de las tres- y se lee bien a plena luz.
    cardClass: 'bg-[#404040] border-2 border-[#41f2c0] scale-105 shadow-2xl',
    iconClass: 'bg-[#41f2c0]/20',
    iconColor: 'text-[#41f2c0]',
    priceColor: 'text-white',
    textColor: 'text-white',
    mutedColor: 'text-gray-300',
    checkBg: 'bg-[#41f2c0]/25',
    checkColor: 'text-[#41f2c0]',
    ctaClass: 'bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold',
    ctaLabel: 'Empezar 14 días gratis',
    features: [
      { text: 'Reservas y calendario', included: true },
      { text: 'Materiales y mensajes con tus alumnos', included: true },
      { text: 'Cobro con tarjeta integrado', included: true },
      { text: 'Seguimiento del alumno', included: true },
      { text: 'Informe mensual para las familias', included: true },
      { text: 'Sin comisión por clase', included: true },
      // "Se graba sola" no es cierto hoy: el profesor tiene que darle a grabar en Meet (el
      // cron le manda un recordatorio). Se deja la promesa en lo que sí se cumple.
      { text: 'Grabas la clase con un botón y tu alumno la repasa cuando quiera', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
];

export default function Pricing() {
  // El pago anual se anunciaba en la letra pequeña y no habia forma de elegirlo. Este
  // interruptor cambia los importes y viaja hasta la pasarela a traves del registro.
  const [anual, setAnual] = useState(false);

  const handleGetStartedStudent = () => {
    window.location.href = createPageUrl('SelectRole') + '?role=student';
  };

  const handleGetStartedTeacher = () => {
    try {
      sessionStorage.setItem('billing_period', anual ? 'anual' : 'mensual');
    } catch (_e) { /* si el navegador lo bloquea, se elige otra vez en el registro */ }
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
              <Sparkles className="text-[#404040]" size={16} aria-hidden="true" />
            </div>
            <span className="text-gray-700 font-medium">Para alumnos es siempre <span className="text-[#0d7a5f] font-bold">gratis</span></span>
            <button
              onClick={handleGetStartedStudent}
              className="text-sm text-[#404040] font-semibold underline underline-offset-2 hover:text-[#0d7a5f] transition-colors"
            >
              Regístrate →
            </button>
          </div>
        </motion.div>

        {/* Teacher plans */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm" role="group" aria-label="Forma de pago">
            <button
              type="button"
              onClick={() => setAnual(false)}
              aria-pressed={!anual}
              className={`px-5 py-2 text-sm rounded-lg transition-colors ${!anual ? 'bg-[#404040] text-white font-semibold' : 'text-gray-600 hover:text-[#404040]'}`}
            >
              Pago mensual
            </button>
            <button
              type="button"
              onClick={() => setAnual(true)}
              aria-pressed={anual}
              className={`px-5 py-2 text-sm rounded-lg transition-colors ${anual ? 'bg-[#404040] text-white font-semibold' : 'text-gray-600 hover:text-[#404040]'}`}
            >
              Pago anual
              <span className={`ml-2 text-xs font-bold ${anual ? 'text-[#41f2c0]' : 'text-[#0d7a5f]'}`}>2 meses gratis</span>
            </button>
          </div>
          {anual && (
            <p className="text-xs text-gray-500">
              Se cobra el año completo al contratar, sin los 14 días de prueba.
            </p>
          )}
        </div>

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
                    <span className={`text-4xl font-bold ${plan.priceColor}`}>
                      {anual && plan.priceAnual ? plan.priceAnual : plan.price}
                    </span>
                    <span className={`text-sm ${plan.mutedColor}`}>
                      {anual && plan.periodAnual ? plan.periodAnual : plan.period}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.mutedColor}`}>
                    {anual && plan.noteAnual ? plan.noteAnual : plan.note}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 ${feature.included ? plan.checkBg : 'bg-red-100'} rounded-full flex items-center justify-center flex-shrink-0`} aria-hidden="true">
                        {feature.included
                          ? <Check className={plan.checkColor} size={12} />
                          : <X className="text-red-700" size={12} />
                        }
                      </div>
                      {/* Lo no incluido iba en text-white/40 salvo en el plan sin cuota: blanco
                          sobre una tarjeta blanca, o sea invisible. Venia de cuando estas
                          tarjetas tenían fondo oscuro. Ahora todas son blancas. */}
                      <span className={`text-sm ${feature.included ? plan.textColor : 'text-gray-500 line-through'}`}>
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
            <a href="/Contact" className="text-[#0d7a5f] font-semibold underline">
              Contáctanos
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
