import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Home, Calendar, BookOpen, Clock } from 'lucide-react';

const STORAGE_KEY = 'hasSeenTeacherOnboarding';

const STEPS = [
  {
    icon: Home,
    title: '¡Bienvenido a tu panel de profesor!',
    description: 'Este es tu dashboard principal. Aquí verás un resumen de tus ingresos, alumnos, clases y valoración de un vistazo.',
    color: '#41f2c0',
  },
  {
    icon: Calendar,
    title: 'Tu Calendario',
    description: 'En "Calendario" puedes ver todas tus clases programadas, navegar por semanas y acceder a los detalles de cada sesión.',
    color: '#404040',
  },
  {
    icon: BookOpen,
    title: 'Gestión de Clases',
    description: 'En "Mis Clases" tienes el historial completo. Puedes crear clases recurrentes y gestionar el estado de cada reserva.',
    color: '#41f2c0',
  },
  {
    icon: Clock,
    title: 'Disponibilidad',
    description: 'Configura tu horario en "Disponibilidad". Define qué días y horas estás libre para que los alumnos puedan reservar.',
    color: '#404040',
  },
];

export default function OnboardingTour({ show, onClose }) {
  const [step, setStep] = useState(0);

  if (!show) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
        >
          {/* Skip */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: current.color + '20' }}
          >
            <Icon size={32} style={{ color: current.color }} />
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 8,
                  backgroundColor: i === step ? '#41f2c0' : '#e5e7eb',
                }}
              />
            ))}
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold text-[#404040] mb-2">{current.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">{current.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep(s => s - 1)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft size={16} className="mr-1" />
              Anterior
            </Button>

            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>

            {isLast ? (
              <Button
                size="sm"
                onClick={handleFinish}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                ¡Empezar!
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                Siguiente
                <ChevronRight size={16} className="ml-1" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Retorna true si el tour debe mostrarse (no se ha visto aún) */
export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  } catch {
    return false;
  }
}

/** Resetea el flag para que el tour vuelva a mostrarse */
export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}