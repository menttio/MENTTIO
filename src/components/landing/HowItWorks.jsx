import React, { useState } from 'react';
import { UserCircle, Search, Calendar, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const studentSteps = [
  {
    icon: UserCircle,
    title: 'Regístrate gratis',
    description: 'Crea tu cuenta de alumno en menos de 30 segundos. Sin tarjeta de crédito, sin compromiso.',
    color: 'bg-blue-500'
  },
  {
    icon: Search,
    title: 'Encuentra tu profesor',
    description: 'Explora nuestra red de profesores expertos. Filtra por materia, nivel y valoraciones.',
    color: 'bg-purple-500'
  },
  {
    icon: Calendar,
    title: 'Reserva tu clase',
    description: 'Elige el horario que mejor te venga. El sistema te muestra solo horarios disponibles.',
    color: 'bg-pink-500'
  },
  {
    icon: CheckCircle,
    title: 'Disfruta y aprende',
    description: 'Asiste a tu clase, accede a las grabaciones y paga solo cuando termines. Simple y seguro.',
    color: 'bg-green-500'
  }
];

const teacherSteps = [
  {
    icon: UserCircle,
    title: 'Crea tu perfil',
    description: 'Configura tu perfil de profesor con tu experiencia, materias y tarifas. Primer mes gratis.',
    color: 'bg-orange-500'
  },
  {
    icon: Calendar,
    title: 'Define tu disponibilidad',
    description: 'Marca tus horarios disponibles una vez. El sistema gestiona automáticamente tus reservas.',
    color: 'bg-red-500'
  },
  {
    icon: Search,
    title: 'Recibe alumnos',
    description: 'Los alumnos te encontrarán y reservarán clases contigo. Recibirás notificaciones automáticas.',
    color: 'bg-yellow-500'
  },
  {
    icon: CheckCircle,
    title: 'Enseña y cobra',
    description: 'Da tus clases, sube materiales y accede a estadísticas. Los pagos se gestionan automáticamente.',
    color: 'bg-cyan-500'
  }
];

export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState('student');
  const steps = activeTab === 'student' ? studentSteps : teacherSteps;

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            En 4 pasos simples, estarás listo para enseñar o aprender
          </p>

          {/* Tabs */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <Button
              onClick={() => setActiveTab('student')}
              className={`px-6 py-3 rounded-lg transition-all ${
                activeTab === 'student'
                  ? 'bg-[#41f2c0] text-white shadow-lg'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              Soy Alumno
            </Button>
            <Button
              onClick={() => setActiveTab('teacher')}
              className={`px-6 py-3 rounded-lg transition-all ${
                activeTab === 'teacher'
                  ? 'bg-[#41f2c0] text-white shadow-lg'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              Soy Profesor
            </Button>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#41f2c0]/20 to-transparent" />
          
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              {/* Step number */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-[#41f2c0] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                {index + 1}
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 text-center relative pt-8 hover:shadow-lg transition-all">
                <div className={`${step.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <step.icon className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-[#404040] mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}