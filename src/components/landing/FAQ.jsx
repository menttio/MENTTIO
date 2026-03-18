import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    question: '¿Para quién está pensada Menttio?',
    // CAMBIO: más directo, elimina la parte de alumnos que diluye el mensaje
    answer: 'Menttio está diseñada para profesores particulares que quieren dejar de perder tiempo organizando sus clases. Si das clases de forma independiente y quieres gestionar horarios, alumnos, pagos y contenido desde un solo lugar, Menttio es para ti. Los alumnos también pueden registrarse y reservar clases, pero el núcleo de la plataforma está pensado para el profesor.'
  },
  {
    question: '¿Cuánto cuesta la suscripción para profesores?',
    answer: 'Ofrecemos dos planes: Plan Básico por 14,99€/mes (gestión de clases, calendario, chat y disponibilidad) y Plan Premium por 36,99€/mes (todo lo anterior más grabación y almacenamiento de clases en la nube). Puedes cancelar en cualquier momento desde tu panel de control.'
  },
  {
    question: '¿Hay período de prueba gratuito?',
    // CAMBIO: título más corto y directo. Respuesta añade urgencia suave
    answer: 'Sí. Al contratar el Plan Básico tienes 14 días de prueba completamente gratuitos, sin compromiso. Puedes cancelar antes de que terminen sin ningún cargo. Es la forma más rápida de ver si Menttio encaja con tu forma de trabajar.'
  },
  {
    question: '¿Cómo evito que mis alumnos reserven clases que se solapen?',
    // CAMBIO: pregunta reformulada desde el punto de vista del problema real del profesor
    answer: 'Tú defines tu disponibilidad en la agenda y los alumnos solo pueden reservar en los huecos que tú has abierto. Sin solapamientos, sin malentendidos, sin tener que gestionar nada a mano.'
  },
  {
    question: '¿Cómo funcionan los pagos?',
    // CAMBIO: título más natural. Respuesta más clara sobre el modelo
    answer: 'Los alumnos pagan directamente a ti, sin comisiones de la plataforma. Menttio te da visibilidad sobre tus ingresos y el historial de pagos, pero el dinero es tuyo desde el primer momento.'
  },
  {
    question: '¿Puedo grabar mis clases y que mis alumnos las revisen después?',
    // CAMBIO: pregunta más orientada al beneficio para el alumno, que es la razón real por la que el profesor quiere grabar
    answer: 'Sí, con el Plan Premium. Las clases quedan grabadas automáticamente y tus alumnos pueden acceder a ellas cuando quieran desde la plataforma. Es una de las funciones que más valoran tanto profesores como alumnos.'
  },
  {
    question: '¿Tengo todos mis alumnos centralizados en un solo lugar?',
    answer: 'Sí. Desde tu panel puedes ver todos tus alumnos, sus clases, historial y comunicaciones. Sin hojas de cálculo, sin agendas de papel, sin depender de WhatsApp para organizarte.'
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
    // CAMBIO: pregunta nueva muy relevante para profesores que están valorando registrarse
    question: '¿Cuánto tiempo tarda configurar mi perfil y empezar a recibir alumnos?',
    answer: 'Menos de 5 minutos. Rellenas tu perfil, defines tu disponibilidad y ya estás listo para recibir reservas. No necesitas instalar nada ni tener conocimientos técnicos.'
  },
  {
    question: '¿Qué soporte ofrece Menttio?',
    answer: 'Soporte por email y chat para todos los usuarios. Los profesores con suscripción activa tienen soporte prioritario, además de acceso a guías y recursos para sacar el máximo partido a la plataforma.'
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
      </div>
    </section>
  );
}