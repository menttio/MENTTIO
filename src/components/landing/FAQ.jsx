import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

const faqs = [
  {
    question: '¿Para quién está pensada Menttio?',
    answer: 'Para profesores particulares que dan clase por videollamada, sobre todo de Matemáticas, Física y Química a ESO, Bachillerato y EBAU. Si ya tienes tus alumnos y los llevas a base de WhatsApp, calendario y Bizum, Menttio es para ti. Tus alumnos entran gratis para reservar, ver materiales y repasar las grabaciones.'
  },
  {
    question: '¿Cuánto cuesta la suscripción para profesores?',
    answer: 'Dos planes y una puerta de entrada. Esencial: 12,99€/mes con todo salvo la grabación. Clase grabada: 29,99€/mes, que añade la grabación de las clases. Y si prefieres empezar sin cuota, 0€/mes con un 10% de las clases que cobres a través de la plataforma. Los planes de suscripción no tienen comisión, y puedes cancelar cuando quieras.'
  },
  {
    question: '¿Hay período de prueba gratuito?',
    answer: 'Sí. Al contratar el plan Esencial tienes 14 días de prueba completamente gratuitos, sin compromiso. Puedes cancelar antes de que terminen sin ningún cargo. Es la forma más rápida de ver si Menttio encaja con tu forma de trabajar.'
  },
  {
    question: '¿Cómo funcionan los pagos?',
    answer: 'Los alumnos pagan directamente a ti, sin comisiones de la plataforma en los planes de suscripción. Menttio te da visibilidad sobre tus ingresos y el historial de pagos, pero el dinero es tuyo desde el primer momento.'
  },
  {
    question: '¿Puedo grabar mis clases y que mis alumnos las revisen después?',
    answer: 'Sí, con el plan Clase grabada. La videollamada se crea sola; tú le das a grabar al empezar y la grabación aparece luego en la ficha de la clase, sin que tengas que descargarla ni enviarla. Tu alumno la repasa cuando quiera. Cada grabación es privada: solo la ven el alumno que estuvo en esa clase y tú, y hace falta su permiso (o el de sus padres, si es menor de 14 años) para grabar.'
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
    question: '¿Menttio me consigue alumnos?',
    answer: 'No, y preferimos decírtelo claro. Menttio no es un portal de anuncios ni te trae alumnos nuevos: es la herramienta con la que gestionas los que ya tienes. Lo que sí hace es ayudarte a conservarlos, porque con grabaciones, materiales y seguimiento das un servicio que pocos profesores particulares ofrecen.'
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
          <p className="text-gray-500 mb-5">¿Tienes más dudas? <a href="/Contact" className="text-[#0d7a5f] font-semibold underline">Contáctanos</a> o pruébalo tú mismo sin compromiso.</p>
          <Button
            onClick={() => window.location.href = createPageUrl('TeacherSignup')}
            size="lg"
            /* En móvil este botón se salía de la pantalla y obligaba a hacer scroll lateral:
               el texto es largo y no rompía de línea. Ahora ocupa el ancho y parte si hace falta. */
            className="bg-[#404040] hover:bg-[#303030] text-white font-bold w-full sm:w-auto whitespace-normal px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg h-auto"
          >
            Empieza gratis — 14 días sin compromiso
          </Button>
        </motion.div>
      </div>
    </section>
  );
}