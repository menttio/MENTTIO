import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const tourSteps = [
  {
    title: '¡Bienvenido a Menπio!',
    content: 'Te vamos a mostrar rápidamente cómo funciona la plataforma para que puedas empezar a dar clases cuanto antes.',
    icon: '👋'
  },
  {
    title: 'Tu Panel Principal',
    content: 'Aquí verás tus estadísticas, próximas clases y ganancias mensuales. Es tu centro de control.',
    icon: '📊'
  },
  {
    title: 'Configura tu Disponibilidad',
    content: 'Ve a "Disponibilidad" para establecer tus horarios semanales. También puedes marcar excepciones para días específicos.',
    icon: '📅'
  },
  {
    title: 'Gestiona tus Asignaturas',
    content: 'En "Mis Asignaturas" puedes añadir más materias, editar precios y actualizar tu perfil profesional.',
    icon: '📚'
  },
  {
    title: 'Calendario de Clases',
    content: 'El calendario te muestra todas tus clases programadas. Puedes ver detalles, modificar horarios o cancelar con anticipación.',
    icon: '🗓️'
  },
  {
    title: 'Comunicación con Alumnos',
    content: 'Usa el sistema de mensajes para comunicarte con tus alumnos. Recibe notificaciones de nuevas reservas y cambios.',
    icon: '💬'
  },
  {
    title: 'Archivos y Materiales',
    content: 'Puedes subir y compartir materiales de estudio en cada clase. Los alumnos también pueden subir archivos.',
    icon: '📎'
  },
  {
    title: '¡Listo para Empezar!',
    content: 'Ya estás preparado. Configura tu disponibilidad y espera a que los alumnos reserven tus clases. ¡Mucha suerte!',
    icon: '🚀'
  }
];

export default function WelcomeTour({ teacherId, teacherName, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await base44.entities.Teacher.update(teacherId, { tour_completed: true });
    onComplete();
  };

  const handleSkip = async () => {
    await base44.entities.Teacher.update(teacherId, { tour_completed: true });
    onComplete();
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-w-[calc(100vw-2rem)] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="text-6xl mb-4">{step.icon}</div>
          {currentStep === 0 && (
            <h2 className="text-2xl font-bold">
              ¡Hola, {teacherName}!
            </h2>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-[#404040] mb-4">{step.title}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">{step.content}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'bg-[#41f2c0] w-8' 
                      : idx < currentStep 
                        ? 'bg-[#41f2c0]/50 w-2' 
                        : 'bg-gray-200 w-2'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} de {tourSteps.length}
            </span>
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ArrowLeft size={18} className="mr-2" />
                Anterior
              </Button>
            )}
            {!isLastStep ? (
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                Siguiente
                <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                <Check size={18} className="mr-2" />
                ¡Empezar!
              </Button>
            )}
          </div>

          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3"
            >
              Saltar tutorial
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}