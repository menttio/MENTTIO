import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: '¿Cuánto cuesta la suscripción para profesores?',
    answer: 'Ofrecemos dos planes: Plan Básico por 14,99€/mes (gestión de clases, calendario, chat y disponibilidad) y Plan Premium por 36,99€/mes (todo lo anterior más grabación y almacenamiento de clases en la nube). Puedes cancelar en cualquier momento desde tu panel de control.'
  },
  {
    question: '¿Los alumnos tienen que pagar algo?',
    answer: 'No. El registro y uso de la plataforma es 100% gratuito para alumnos. Solo pagas las clases que tomes directamente al profesor, sin comisiones adicionales de Menttio.'
  },
  {
    question: '¿Hay período de prueba gratuito para profesores?',
    answer: 'Sí. Al contratar el Plan Básico, disfrutas de 14 días de prueba completamente gratuitos. Puedes cancelar antes de que finalicen sin ningún cargo. Una vez pasado el período de prueba, se realizará el cobro mensual automáticamente.'
  },
  {
    question: '¿Cómo se gestionan los pagos de las clases?',
    answer: 'Los alumnos pagan las clases directamente al profesor. Menttio no interviene ni cobra comisiones por las clases. La suscripción mensual del profesor es lo único que se factura a través de la plataforma.'
  },
  {
    question: '¿Puedo acceder a las grabaciones de mis clases?',
    answer: 'Sí, pero solo con el Plan Premium. Las clases quedan grabadas automáticamente y almacenadas en la nube. Tanto el profesor como el alumno tienen acceso a las grabaciones para repasar el contenido cuando quieran.'
  },
  {
    question: '¿Qué pasa si necesito cancelar una clase?',
    answer: 'Puedes cancelar o modificar una clase hasta 24 horas antes sin ningún problema. El sistema notifica automáticamente a la otra parte y libera el horario. Si cancelas con menos de 24h, se aplicarán las políticas del profesor.'
  },
  {
    question: '¿Cómo me comunico con mi profesor o alumno?',
    answer: 'Menttio incluye un sistema de chat integrado donde puedes comunicarte directamente con tus profesores o alumnos, compartir archivos, resolver dudas y coordinar las clases.'
  },
  {
    question: '¿Puedo subir materiales y ejercicios?',
    answer: 'Sí, tanto profesores como alumnos pueden subir archivos, ejercicios y materiales de estudio. Todo queda organizado por clase y accesible desde cualquier dispositivo.'
  },
  {
    question: '¿Hay límite de clases o alumnos?',
    answer: 'No hay límites. Los alumnos pueden reservar con tantos profesores como quieran y los profesores pueden tener tantos alumnos como puedan gestionar. La plataforma escala contigo.'
  },
  {
    question: '¿Qué soporte ofrecen?',
    answer: 'Ofrecemos soporte por email y chat para todos los usuarios. Los profesores con suscripción activa tienen soporte prioritario. También disponemos de tutoriales y guías para sacar el máximo partido a la plataforma.'
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
          <p className="text-xl text-gray-600">
            Todo lo que necesitas saber sobre Menttio
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