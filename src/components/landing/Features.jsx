import React from 'react';
import { Calendar, Video, Cloud, MessageCircle, BarChart3, CreditCard, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Video,
    title: 'La clase queda grabada',
    description: 'La videollamada se crea sola y la grabación aparece luego en la ficha de la clase. Tu alumno repasa antes del examen y tú no haces nada extra.',
    color: 'bg-[#41f2c0]'
  },
  {
    icon: Cloud,
    title: 'Apuntes y ejercicios en su sitio',
    description: 'Sube el material una vez y queda junto a la clase a la que pertenece. Se acabó reenviar el mismo PDF por WhatsApp cada semana.',
    color: 'bg-purple-500'
  },
  {
    icon: BarChart3,
    title: 'Seguimiento del alumno',
    description: 'Apunta cómo ha ido cada clase y ten a mano su evolución. Cuando una familia pregunte qué tal va su hijo, tendrás la respuesta con datos.',
    color: 'bg-orange-500'
  },
  {
    icon: CreditCard,
    title: 'Cobro sin perseguir a nadie',
    description: 'Tus alumnos pagan con tarjeta al reservar, o marcas el pago por Bizum. Siempre sabes quién te debe qué.',
    color: 'bg-pink-500'
  },
  {
    icon: Calendar,
    title: 'Tu horario, tus normas',
    description: 'Marcas tus huecos una vez y tus alumnos reservan solo ahí. Sin solapamientos y sin negociar la hora por mensajes.',
    color: 'bg-blue-500'
  },
  {
    icon: Zap,
    title: 'Recordatorios automáticos',
    description: 'Tus alumnos reciben el aviso y el enlace de la clase sin que tengas que escribirles. Menos olvidos y menos plantones.',
    color: 'bg-yellow-500'
  },
  {
    icon: MessageCircle,
    title: 'Dudas en un solo sitio',
    description: 'Las preguntas entre clase y clase quedan en la conversación del alumno, no perdidas entre chats personales.',
    color: 'bg-green-500'
  },
  {
    icon: Users,
    title: 'Tus números claros',
    description: 'Cuánto has ingresado, cuántas horas has dado y qué alumno viene más. Datos reales de tu actividad, sin hojas de cálculo.',
    color: 'bg-indigo-500'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
La parte aburrida de dar clase, resuelta
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
Tú te dedicas a explicar. Menttio se encarga de la videollamada, la grabación, los materiales, los recordatorios y el cobro.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div className={`${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="text-white" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#404040] mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}