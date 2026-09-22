import React, { useState } from 'react';
import { UserCircle, Search, Calendar, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const studentSteps = [
  {
    icon: UserCircle,
    title: 'Regístrate gratis',
    description: 'Tu profesor te invita y creas tu cuenta en un minuto. Desde ahí ves sus horarios, tus clases y tus materiales.',
    color: 'bg-blue-500'
  },
  {
    icon: Search,
    title: 'Elige hora con tu profesor',
    description: 'Ves los huecos que tu profesor tiene libres y reservas el que te viene bien, sin cruzar mensajes para cuadrarlo.',
    color: 'bg-purple-500'
  },
  {
    icon: Calendar,
    title: 'Reserva tu clase',
    description: 'Confirmas la clase y pagas con tarjeta si tu profesor lo tiene activado. El enlace de la videollamada te llega solo.',
    color: 'bg-pink-500'
  },
  {
    icon: CheckCircle,
    title: 'Repasa cuando lo necesites',
    description: 'Después de la clase tienes los apuntes y, si tu profesor graba, la grabación para volver a verla antes del examen.',
    color: 'bg-green-500'
  }
];

const teacherSteps = [
  {
    icon: UserCircle,
    // CAMBIO: título más concreto, descripción con dato de tiempo que reduce fricción
    title: 'Monta tu espacio en 5 minutos',
    description: 'Añade tus materias, tus tarifas y tus horarios. Menttio es tu herramienta de trabajo: los alumnos los traes tú, y aquí los gestionas.',
    color: 'bg-orange-500'
  },
  {
    icon: Calendar,
    // CAMBIO: título más orientado al resultado, no a la acción
    title: 'Define cuándo quieres dar clases',
    description: 'Marca tus huecos una sola vez. Tus alumnos reservan dentro de ese horario, sin solapamientos y sin negociar la hora por mensajes.',
    color: 'bg-red-500'
  },
  {
    icon: Search,
    // CAMBIO: descripción más directa al beneficio, elimina "sin depender de múltiples herramientas" que es vago
    title: 'Da la clase sin preparar nada más',
    description: 'La videollamada se crea sola y tu alumno recibe el enlace. Tú solo entras y explicas.'
    color: 'bg-yellow-500'
  },
  {
    icon: CheckCircle,
    // CAMBIO: paso final reescrito — el original era una lista de features, este habla del estado al que llega el profesor
    title: 'Al terminar, ya está todo hecho',
    description: 'La grabación queda guardada en la ficha de la clase, los apuntes en su sitio y el pago registrado. Sin tareas pendientes.',
    color: 'bg-cyan-500'
  }
];

export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState('teacher');
  // CAMBIO: tab de profesor activo por defecto, ya que es el público principal

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
          {/* CAMBIO: subtítulo reescrito para que el profesor sea el protagonista */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {activeTab === 'teacher'
              ? 'En 4 pasos tienes tu perfil activo y empiezas a recibir reservas sin gestionar nada a mano'
              : 'En 4 pasos encuentras tu profesor, reservas tu clase y accedes a todo el contenido'}
          </p>

          {/* Tabs */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <Button
              onClick={() => setActiveTab('teacher')}
              className={`px-6 py-3 rounded-lg transition-all ${
                activeTab === 'teacher'
                  ? 'bg-[#41f2c0] text-[#404040] font-semibold shadow-lg'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              Soy Profesor
            </Button>
            <Button
              onClick={() => setActiveTab('student')}
              className={`px-6 py-3 rounded-lg transition-all ${
                activeTab === 'student'
                  ? 'bg-[#41f2c0] text-[#404040] font-semibold shadow-lg'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              Soy Alumno
            </Button>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#41f2c0]/70 to-transparent" />
          
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