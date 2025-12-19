import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { User, Star, BookOpen, Award, Languages, Pencil, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const TOUR_STEPS = [
  {
    target: '.profile-header',
    title: '¡Bienvenido a tu Perfil! 👤',
    content: 'Este es tu perfil público. Los alumnos verán esta información cuando busquen profesores.',
    icon: User,
    position: 'bottom'
  },
  {
    target: '.edit-profile-btn',
    title: 'Editar Perfil',
    content: 'Haz clic aquí para actualizar tu información, biografía, especialidades y más.',
    icon: Pencil,
    position: 'left'
  },
  {
    target: '.profile-rating',
    title: 'Tu Valoración',
    content: 'Aquí se muestra tu puntuación media y el número de clases impartidas. ¡Trabaja para mantenerla alta!',
    icon: Star,
    position: 'bottom'
  },
  {
    target: '.profile-subjects',
    title: 'Asignaturas',
    content: 'Tus asignaturas y precios por hora. Los alumnos pueden ver qué enseñas y cuánto cobras.',
    icon: BookOpen,
    position: 'right'
  },
  {
    target: '.profile-tabs',
    title: 'Información Detallada',
    content: 'En "Sobre mí" verás tu biografía, métodos, especialidades e idiomas. En "Reseñas" encontrarás las valoraciones de tus alumnos.',
    icon: Award,
    position: 'bottom'
  }
];

export default function ProfileTour({ teacherId, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState(null);

  useEffect(() => {
    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);
    
    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
    };
  }, [currentStep]);

  const updateTooltipPosition = () => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target);
    if (!element) {
      setTimeout(updateTooltipPosition, 100);
      return;
    }

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    setHighlightRect({
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height
    });

    let top = 0;
    let left = 0;

    if (step.position === 'bottom') {
      top = rect.bottom + scrollTop + 20;
      left = rect.left + scrollLeft + (rect.width / 2);
    } else if (step.position === 'right') {
      top = rect.top + scrollTop + (rect.height / 2);
      left = rect.right + scrollLeft + 20;
    } else if (step.position === 'left') {
      // Ajuste específico para el paso 2 (botón editar)
      if (currentStep === 1) {
        top = rect.top + scrollTop + (rect.height / 2) + 80;
      } else {
        top = rect.top + scrollTop + (rect.height / 2);
      }
      left = rect.left + scrollLeft - 20;
    }

    setTooltipPosition({ top, left });
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    try {
      await base44.entities.Teacher.update(teacherId, {
        profile_tour_completed: true
      });
    } catch (error) {
      console.error('Error updating tour status:', error);
    }

    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step?.icon;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100]"
        style={{ pointerEvents: 'none' }}
      />

      {/* Highlight */}
      <AnimatePresence mode="wait">
        {highlightRect && (
          <motion.div
            key={`highlight-${currentStep}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[101] pointer-events-none"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              border: '3px solid #41f2c0',
              borderRadius: '12px',
              boxShadow: '0 0 0 4px rgba(65, 242, 192, 0.2), 0 0 30px rgba(65, 242, 192, 0.4)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {step && (
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[102] bg-white rounded-2xl shadow-2xl p-6 max-w-md"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: step.position === 'bottom' 
                ? 'translateX(-50%)' 
                : step.position === 'left'
                ? 'translate(-100%, -50%)'
                : step.position === 'right'
                ? 'translateY(-50%)'
                : 'translateX(-50%)'
            }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center mb-4">
              <Icon className="text-[#41f2c0]" size={24} />
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-[#404040] mb-2">{step.title}</h3>
            <p className="text-gray-600 mb-6">{step.content}</p>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-4">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    idx === currentStep ? 'bg-[#41f2c0]' : idx < currentStep ? 'bg-[#41f2c0]/50' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handlePrevious}
                variant="ghost"
                disabled={currentStep === 0}
                className="text-gray-500"
              >
                <ChevronLeft size={18} className="mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-gray-500">
                {currentStep + 1} de {TOUR_STEPS.length}
              </span>

              <Button
                onClick={handleNext}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    Finalizar
                    <Check size={18} className="ml-1" />
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight size={18} className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}