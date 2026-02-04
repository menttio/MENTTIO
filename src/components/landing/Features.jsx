import React from 'react';
import { Calendar, Video, Cloud, MessageCircle, BarChart3, Lock, Zap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Calendar,
    title: 'Reserva en segundos',
    description: 'Sistema de calendario inteligente que muestra solo los horarios disponibles. Reserva tu clase en menos de 1 minuto.',
    color: 'bg-blue-500'
  },
  {
    icon: Video,
    title: 'Grabaciones en la nube',
    description: 'Todas tus clases grabadas y accesibles para siempre. Repasa el contenido cuando quieras, desde cualquier dispositivo.',
    color: 'bg-purple-500'
  },
  {
    icon: MessageCircle,
    title: 'Chat integrado',
    description: 'Comunícate directamente con tus profesores o alumnos. Comparte archivos, dudas y materiales de forma instantánea.',
    color: 'bg-pink-500'
  },
  {
    icon: BarChart3,
    title: 'Estadísticas detalladas',
    description: 'Para profesores: seguimiento de horas, ingresos y alumnos. Para alumnos: progreso y clases completadas.',
    color: 'bg-orange-500'
  },
  {
    icon: Users,
    title: 'Red de profesores expertos',
    description: 'Accede a cientos de profesores especializados en todas las materias. Elige el que mejor se adapte a ti.',
    color: 'bg-green-500'
  },
  {
    icon: Lock,
    title: 'Pagos seguros',
    description: 'Integración con Stripe para pagos seguros. Los alumnos pagan solo las clases realizadas.',
    color: 'bg-red-500'
  },
  {
    icon: Zap,
    title: 'Notificaciones automáticas',
    description: 'Recordatorios de clases, nuevas reservas y mensajes. Nunca te pierdas nada importante.',
    color: 'bg-yellow-500'
  },
  {
    icon: Cloud,
    title: 'Almacenamiento ilimitado',
    description: 'Sube y comparte materiales, ejercicios y apuntes sin límite. Todo organizado por clase.',
    color: 'bg-cyan-500'
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
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Menttio automatiza todo el proceso de gestión de clases particulares para que te centres en lo importante: enseñar y aprender.
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