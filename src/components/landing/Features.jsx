import React from 'react';
import { Calendar, Video, Cloud, MessageCircle, BarChart3, CreditCard, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description: 'Define tu disponibilidad y olvídate de gestionar huecos manualmente. Tus alumnos solo ven los horarios que tú tienes libres, sin solapamientos ni confusiones.',
    color: 'bg-blue-500'
  },
  {
    icon: Users,
    title: 'Gestión de alumnos',
    description: 'Ten a todos tus alumnos organizados en un solo lugar. Consulta su historial, seguimiento y progreso sin depender de hojas de cálculo ni notas sueltas.',
    color: 'bg-green-500'
  },
  {
    icon: CreditCard,
    title: 'Pagos integrados',
    description: 'Cobra tus clases de forma automática y centralizada. Sin perseguir transferencias ni recordar quién te debe qué. Todo registrado y controlado desde la plataforma.',
    color: 'bg-red-500'
  },
  {
    icon: Zap,
    title: 'Reservas automáticas',
    description: 'Tus alumnos reservan, confirman y cancelan sin que tú tengas que intervenir. Menos WhatsApps, menos interrupciones, más tiempo para enseñar.',
    color: 'bg-yellow-500'
  },
  {
    icon: Video,
    title: 'Clases grabadas',
    description: 'Graba tus sesiones automáticamente y deja que tus alumnos las reposen cuando quieran. Tú no haces nada extra — la plataforma lo gestiona por ti.',
    color: 'bg-purple-500'
  },
  {
    icon: Cloud,
    title: 'Materiales siempre accesibles',
    description: 'Sube apuntes, ejercicios y recursos una sola vez y olvídate. Tus alumnos los encuentran organizados sin que tengas que reenviar nada por correo o WhatsApp.',
    color: 'bg-cyan-500'
  },
  {
    icon: MessageCircle,
    title: 'Comunicación centralizada',
    description: 'Habla con tus alumnos, resuelve dudas y comparte archivos desde un solo sitio. Sin saltar entre apps ni perder mensajes importantes.',
    color: 'bg-pink-500'
  },
  {
    icon: BarChart3,
    title: 'Panel de control de tu negocio',
    description: 'Visualiza tus ingresos, horas impartidas y actividad por alumno. Toma decisiones con datos reales sobre cómo está funcionando tu trabajo como profesor.',
    color: 'bg-orange-500'
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
            Deja de perder tiempo organizando tus clases
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Menttio es la plataforma todo en uno para profesores particulares: gestiona horarios, alumnos, pagos, grabaciones y materiales desde un solo lugar.
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