import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

const faqs = [
  {
    question: '¿Para quién está pensada Menttio?',
    answer: 'Menttio está diseñada para profesores particulares que quieren dejar de perder tiempo organizando sus clases. Si das clases de forma independiente y quieres gestionar horarios, alumnos, pagos y contenido desde un solo lugar, Menttio es para ti. Los alumnos también pueden registrarse y reservar clases, pero el núcleo de la plataforma está pensado para el profesor.'
  },
  {
    question: '¿Cuánto cuesta la suscripción para profesores?',
    answer: 'Hay tres opciones: Plan Comisión (0€/mes, Menttio retiene un 25% por clase), Plan Básico por 14,99€/mes y Plan Premium por 36,99€/mes con grabación de clases incluida. Los planes de suscripción no tienen comisión por clase. Puedes cancelar en cualquier momento.'
  },
  {
    question: '¿Hay período de prueba gratuito?',
    answer: 'Sí. Al contratar el Plan Básico tienes 14 días de prueba completamente gratuitos, sin compromiso. Puedes cancelar antes de que terminen sin ningún cargo. Es la forma más rápida de ver si Menttio encaja con tu forma de trabajar.'
  },
  {
    question: '¿Cómo funcionan los pagos?',
    answer: 'Los alumnos pagan directamente a ti, sin comisiones de la plataforma en los planes de suscripción. Menttio te da visibilidad sobre tus ingresos y el historial de pagos, pero el dinero es tuyo desde el primer momento.'
  },
  {
    question: '¿Puedo grabar mis clases y que mis alumnos las revisen después?',
    answer: 'Sí, con el Plan Premium. Las clases quedan grabadas automáticamente y tus alumnos pueden acceder a ellas cuando quieran desde la plataforma. Es una de las funciones que más valoran tanto profesores como alumnos.'
  },
  {
    question: '¿Puedo subir apuntes, ejercicios y materiales?',
    answer: 'Sí. Puedes subir materiales para cada clase y tus alumnos los encuentran organizados directamente en la plataforma. Sin reenviar archivos por correo ni por WhatsApp cada vez.'
  },
  {
    question: '¿Los alumnos tienen que pagar por usar la plataforma?',
    answer: 'No. El registro y el uso de la plataforma es completamente gratuito para los alumnos. Solo pagan las clases directamente al profesor.'
  },
  {
    question: '¿Cuánto tiempo tarda configurar mi perfil y empezar a recibir alumnos?',
    answer: 'Menos de 5 minutos. Rellenas tu perfil, defines tu disponibilidad y ya estás listo para recibir reservas. No necesitas instalar nada ni tener conocimientos técnicos.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Preguntas frecuentes
          </h2>
          {/* CAMBIO: subtítulo más directo, elimina "si eres profesor" que es redundante */}
          <p className="text-xl text-gray-600">
            Todo lo que necesitas saber antes de empezar
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-[#404040] pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`text-[#41f2c0] flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  size={24}
                />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <p className="text-gray-500 mb-5">¿Tienes más dudas? <a href="/Contact" className="text-[#41f2c0] font-semibold hover:underline">Contáctanos</a> o pruébalo tú mismo sin compromiso.</p>
          <Button
            onClick={() => window.location.href = createPageUrl('TeacherSignup')}
            size="lg"
            className="bg-[#404040] hover:bg-[#303030] text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
          >
            Empieza gratis — 14 días sin compromiso
          </Button>
        </motion.div>
      </div>
    </section>
  );
}