import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Clock,
  BookOpen,
  Users,
  DollarSign,
  Star,
  MessageCircle,
  User,
  BarChart3,
  Bell
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const tourSteps = [
  // Dashboard inicial
  {
    target: '.stats-earnings',
    title: 'Ingresos del mes',
    content: 'Aquí verás tus ganancias mensuales actualizadas en tiempo real con cada clase completada.',
    icon: DollarSign,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.stats-students',
    title: 'Tus alumnos',
    content: 'Número total de alumnos únicos que han reservado clases contigo.',
    icon: Users,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.stats-classes',
    title: 'Total de clases',
    content: 'Todas las clases que has impartido desde que te registraste.',
    icon: BookOpen,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.stats-rating',
    title: 'Tu valoración',
    content: 'Calificación promedio basada en las reseñas de tus alumnos.',
    icon: Star,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.subjects-card',
    title: 'Gestiona tus asignaturas',
    content: 'Añade o elimina asignaturas que impartes y ajusta tus precios por hora cuando lo necesites.',
    icon: BookOpen,
    position: 'top',
    page: 'TeacherDashboard'
  },
  {
    target: '.upcoming-classes',
    title: 'Próximas clases',
    content: 'Accede rápidamente a tus próximas clases programadas con toda la información relevante.',
    icon: Calendar,
    position: 'top',
    page: 'TeacherDashboard'
  },
  // Mi Calendario
  {
    target: '.calendar-view',
    title: 'Vista de calendario',
    content: 'Visualiza todas tus clases programadas en formato calendario mensual. Haz clic en cualquier día para ver detalles.',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherCalendar'
  },
  // Disponibilidad
  {
    target: '.availability-schedule',
    title: 'Configura tu horario',
    content: 'Define tu disponibilidad semanal. Activa los días que trabajas y establece tus horarios disponibles.',
    icon: Clock,
    position: 'top',
    page: 'ManageAvailability'
  },
  // Mis Asignaturas
  {
    target: '.subjects-management',
    title: 'Gestión de asignaturas',
    content: 'Añade nuevas asignaturas, modifica precios y elimina las que ya no impartes.',
    icon: BookOpen,
    position: 'bottom',
    page: 'ManageSubjects'
  },
  // Estadísticas
  {
    target: '.workload-stats',
    title: 'Analiza tu actividad',
    content: 'Consulta estadísticas detalladas sobre tus clases, ingresos y rendimiento a lo largo del tiempo.',
    icon: BarChart3,
    position: 'bottom',
    page: 'TeacherWorkload'
  },
  // Mi Perfil
  {
    target: '.profile-info',
    title: 'Tu perfil público',
    content: 'Edita tu información personal, biografía y credenciales que verán tus alumnos.',
    icon: User,
    position: 'bottom',
    page: 'TeacherProfile'
  },
  // Mensajes
  {
    target: '.messages-list',
    title: 'Comunicación con alumnos',
    content: 'Gestiona todas tus conversaciones con alumnos en un solo lugar.',
    icon: MessageCircle,
    position: 'bottom',
    page: 'Messages'
  },
  // Mis Alumnos
  {
    target: '.students-list',
    title: 'Base de datos de alumnos',
    content: 'Consulta información detallada de cada alumno, historial de clases y progreso.',
    icon: Users,
    position: 'bottom',
    page: 'MyStudents'
  }
];

export default function InteractiveTour({ teacherId, teacherName, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to the page for current step
    const step = tourSteps[currentStep];
    if (step.page && window.location.pathname !== createPageUrl(step.page)) {
      navigate(createPageUrl(step.page));
    }
    
    // Wait for navigation and then update position
    const timer = setTimeout(() => {
      updateTooltipPosition();
    }, 300);

    window.addEventListener('resize', updateTooltipPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [currentStep]);

  const updateTooltipPosition = () => {
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      let top, left;
      
      if (step.position === 'bottom') {
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + (rect.width / 2);
      } else {
        top = rect.top + scrollTop - 20;
        left = rect.left + scrollLeft + (rect.width / 2);
      }
      
      setTooltipPosition({ top, left, position: step.position });
      
      // Add highlight class
      element.classList.add('tour-highlight');
      
      return () => {
        element.classList.remove('tour-highlight');
      };
    }
  };

  const handleNext = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(tourSteps[currentStep].target);
    if (currentElement) {
      currentElement.classList.remove('tour-highlight');
    }

    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    // Remove highlight from current element
    const currentElement = document.querySelector(tourSteps[currentStep].target);
    if (currentElement) {
      currentElement.classList.remove('tour-highlight');
    }

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await base44.entities.Teacher.update(teacherId, { tour_completed: true });
      onComplete();
      // Redirect to availability page
      navigate(createPageUrl('ManageAvailability'));
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  };

  const handleSkip = async () => {
    try {
      await base44.entities.Teacher.update(teacherId, { tour_completed: true });
      onComplete();
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;

  return (
    <>
      {/* Overlay with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] pointer-events-none"
      />

      {/* Highlight cutout - using box-shadow trick */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 101;
          box-shadow: 0 0 0 4px rgba(65, 242, 192, 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: step.position === 'bottom' ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: 'absolute',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: tooltipPosition.position === 'bottom' 
              ? 'translateX(-50%)' 
              : 'translateX(-50%) translateY(-100%)',
            zIndex: 102,
            pointerEvents: 'auto'
          }}
          className="w-96 max-w-[calc(100vw-2rem)]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-[#41f2c0] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{step.title}</h3>
                    <p className="text-white/80 text-xs">
                      Paso {currentStep + 1} de {tourSteps.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed">{step.content}</p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <div className="flex gap-1">
                {tourSteps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep 
                        ? 'w-8 bg-[#41f2c0]' 
                        : 'w-1.5 bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    size="sm"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  size="sm"
                >
                  {currentStep === tourSteps.length - 1 ? (
                    <>Configurar disponibilidad</>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight size={16} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Arrow pointer */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 ${
              tooltipPosition.position === 'bottom' 
                ? '-top-3' 
                : '-bottom-3'
            }`}
          >
            <div 
              className={`w-0 h-0 border-l-[12px] border-r-[12px] border-transparent ${
                tooltipPosition.position === 'bottom'
                  ? 'border-b-[12px] border-b-[#41f2c0]'
                  : 'border-t-[12px] border-t-white'
              }`}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}