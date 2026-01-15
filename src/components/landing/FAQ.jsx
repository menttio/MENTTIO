import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: '¿Cómo funciona el periodo de prueba para profesores?',
    answer: 'Los profesores tienen 30 días completamente gratis para probar toda la plataforma. No se requiere tarjeta de crédito. Después del mes de prueba, si decides continuar, se cobra 20€/mes. Puedes cancelar en cualquier momento.'
  },
  {
    question: '¿Los alumnos tienen que pagar algo?',
    answer: 'No. El registro y uso de la plataforma es 100% gratuito para alumnos. Solo pagas las clases que tomes directamente a través de Stripe, sin comisiones adicionales de Menπio.'
  },
  {
    question: '¿Cómo se gestionan los pagos de las clases?',
    answer: 'Todos los pagos se procesan de forma segura a través de Stripe. Los alumnos pagan después de cada clase completada. Los profesores reciben el dinero automáticamente en su cuenta, sin preocuparse de gestiones.'
  },
  {
    question: '¿Puedo acceder a las grabaciones de mis clases?',
    answer: 'Sí, todas las clases quedan grabadas automáticamente y almacenadas en la nube de forma segura. Tanto profesores como alumnos tienen acceso ilimitado a las grabaciones para repasar el contenido cuando quieran.'
  },
  {
    question: '¿Qué pasa si necesito cancelar una clase?',
    answer: 'Puedes cancelar o modificar una clase hasta 24 horas antes sin ningún problema. El sistema notifica automáticamente a la otra parte y libera el horario. Si cancelas con menos de 24h, se aplicarán las políticas del profesor.'
  },
  {
    question: '¿Cómo me comunico con mi profesor/alumno?',
    answer: 'Menπio incluye un sistema de chat integrado donde puedes comunicarte directamente con tus profesores o alumnos, compartir archivos, resolver dudas y coordinar las clases.'
  },
  {
    question: '¿Puedo subir materiales y ejercicios?',
    answer: 'Sí, tanto profesores como alumnos pueden subir archivos, ejercicios y materiales de estudio. Todo queda organizado por clase y accesible desde cualquier dispositivo.'
  },
  {
    question: '¿Hay límite de clases o profesores?',
    answer: 'No hay límites. Los alumnos pueden reservar con tantos profesores como quieran y los profesores pueden tener tantos alumnos como puedan gestionar. La plataforma escala contigo.'
  },
  {
    question: '¿Qué soporte ofrecen?',
    answer: 'Ofrecemos soporte prioritario por email y chat. Los profesores con suscripción activa tienen soporte premium 24/7. También tenemos una base de conocimiento completa con tutoriales y guías.'
  },
  {
    question: '¿Puedo probar la plataforma antes de decidirme?',
    answer: 'Por supuesto. Los profesores tienen 30 días gratis y los alumnos pueden registrarse y explorar la plataforma sin costo. No hay compromiso ni necesidad de datos de pago para empezar.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-24 bg-gray-50">
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
          <p className="text-xl text-gray-600">
            Todo lo que necesitas saber sobre Menπio
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
      </div>
    </section>
  );
}