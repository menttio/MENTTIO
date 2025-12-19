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
  Bell,
  Award,
  Search
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const tourSteps = [
  // Dashboard - Inicio
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
    target: '.action-calendar',
    title: 'Acceso rápido al calendario',
    content: 'Haz clic aquí para ver tu calendario completo con todas las clases programadas.',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.action-availability',
    title: 'Gestión de disponibilidad',
    content: 'Configura tu horario semanal y excepciones desde este acceso directo.',
    icon: Clock,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.action-students',
    title: 'Ver tus alumnos',
    content: 'Accede al listado completo de tus alumnos y su información.',
    icon: Users,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  {
    target: '.upcoming-classes',
    title: 'Próximas clases',
    content: 'Accede rápidamente a tus próximas clases programadas con toda la información relevante.',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherDashboard'
  },
  
  // Mi Calendario - Detalles
  {
    target: '.calendar-legend',
    title: 'Leyenda del calendario',
    content: 'Los puntos de colores indican: verde para clases reservadas, azul para disponibilidad regular, morado para excepciones y rojo para días no disponibles.',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherCalendar'
  },
  {
    target: '.calendar-view',
    title: 'Vista de calendario mensual',
    content: 'Navega por los meses y haz clic en cualquier día para ver los detalles de tus clases y disponibilidad.',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherCalendar'
  },
  {
    target: '.day-details',
    title: 'Detalles del día seleccionado',
    content: 'Aquí ves información completa del día: clases programadas con hora y alumno, y tu disponibilidad configurada.',
    icon: Clock,
    position: 'left',
    page: 'TeacherCalendar'
  },
  
  // Disponibilidad - Detalles
  {
    target: '.availability-schedule',
    title: 'Horario semanal regular',
    content: 'Activa los días de la semana que trabajas. Para cada día activo, define las franjas horarias en las que estás disponible.',
    icon: Clock,
    position: 'top',
    page: 'ManageAvailability'
  },
  {
    target: '.exceptions-tab',
    title: 'Excepciones puntuales',
    content: 'Añade días específicos con horarios diferentes o márcalos como no disponibles. Útil para vacaciones o eventos especiales.',
    icon: Calendar,
    position: 'top',
    page: 'ManageAvailability'
  },
  
  // Mis Asignaturas - Detalles
  {
    target: '.subjects-management',
    title: 'Tus asignaturas activas',
    content: 'Cada tarjeta muestra una asignatura que impartes con su precio por hora. Edita el precio o elimina asignaturas desde los botones.',
    icon: BookOpen,
    position: 'bottom',
    page: 'ManageSubjects'
  },
  
  // Estadísticas - Detalles
  {
    target: '.stat-total-classes',
    title: 'Total de clases',
    content: 'Número total de clases impartidas en el periodo seleccionado (esta semana o este mes).',
    icon: Calendar,
    position: 'bottom',
    page: 'TeacherWorkload'
  },
  {
    target: '.stat-hours',
    title: 'Horas impartidas',
    content: 'Total de horas de clase que has dado. Se calcula sumando la duración de todas tus clases del periodo.',
    icon: Clock,
    position: 'bottom',
    page: 'TeacherWorkload'
  },
  {
    target: '.stat-earnings',
    title: 'Ingresos generados',
    content: 'Total de dinero ganado en el periodo seleccionado. Se actualiza automáticamente con cada clase completada.',
    icon: DollarSign,
    position: 'bottom',
    page: 'TeacherWorkload'
  },
  {
    target: '.stat-students-count',
    title: 'Alumnos distintos',
    content: 'Número de alumnos únicos con los que has tenido clase en este periodo.',
    icon: Users,
    position: 'bottom',
    page: 'TeacherWorkload'
  },
  {
    target: '.subjects-breakdown',
    title: 'Distribución por asignatura',
    content: 'Gráfico que muestra cuántas clases has dado de cada asignatura. Te ayuda a identificar tus materias más demandadas.',
    icon: BookOpen,
    position: 'top',
    page: 'TeacherWorkload'
  },
  {
    target: '.top-students',
    title: 'Principales alumnos',
    content: 'Lista de tus alumnos más activos con el número de clases y los ingresos generados por cada uno.',
    icon: Users,
    position: 'top',
    page: 'TeacherWorkload'
  },
  
  // Mi Perfil - Detalles
  {
    target: '.profile-info',
    title: 'Cabecera de tu perfil',
    content: 'Tu foto, nombre, valoración y asignaturas. Esta es la primera impresión que tendrán los alumnos al ver tu perfil.',
    icon: User,
    position: 'bottom',
    page: 'TeacherProfile'
  },
  {
    target: '.profile-tabs',
    title: 'Pestañas de información',
    content: 'Navega entre tu información profesional (experiencia, métodos, certificaciones) y las reseñas de tus alumnos.',
    icon: BookOpen,
    position: 'bottom',
    page: 'TeacherProfile'
  },
  {
    target: '.profile-experience',
    title: 'Experiencia y formación',
    content: 'Tus años de experiencia y estudios. Edita esta información para destacar tus credenciales ante los alumnos.',
    icon: Award,
    position: 'bottom',
    page: 'TeacherProfile'
  },
  {
    target: '.profile-reviews',
    title: 'Reseñas de alumnos',
    content: 'Valoraciones y comentarios que han dejado tus alumnos. Estas reseñas son públicas y ayudan a nuevos alumnos a decidir.',
    icon: Star,
    position: 'top',
    page: 'TeacherProfile'
  },
  
  // Mensajes - Detalles
  {
    target: '.messages-search',
    title: 'Buscar conversaciones',
    content: 'Filtra tus conversaciones por nombre de alumno para encontrar rápidamente con quién necesitas hablar.',
    icon: Search,
    position: 'bottom',
    page: 'Messages'
  },
  {
    target: '.conversations-sidebar',
    title: 'Lista de chats',
    content: 'Todas tus conversaciones activas ordenadas por mensaje más reciente. Haz clic en una para abrirla.',
    icon: MessageCircle,
    position: 'right',
    page: 'Messages'
  },
  {
    target: '.chat-window-area',
    title: 'Ventana de chat',
    content: 'Aquí ves el historial completo de mensajes con el alumno seleccionado y puedes escribir nuevos mensajes.',
    icon: MessageCircle,
    position: 'left',
    page: 'Messages'
  },
  
  // Mis Alumnos - Detalles
  {
    target: '.students-list',
    title: 'Tarjetas de alumnos',
    content: 'Cada tarjeta muestra: clases totales, próximas clases, dinero gastado, asignaturas cursadas y acceso rápido a su historial.',
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
    // Remove highlight from previous element
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    // Navigate to the page for current step
    const step = tourSteps[currentStep];
    if (step.page && window.location.pathname !== createPageUrl(step.page)) {
      navigate(createPageUrl(step.page));
    }
    
    // Wait for navigation and then update position
    const timer = setTimeout(() => {
      updateTooltipPosition();
    }, 800);
    
    // Additional retry to ensure element is found
    const retryTimer = setTimeout(() => {
      updateTooltipPosition();
    }, 1200);

    window.addEventListener('resize', updateTooltipPosition);
    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      window.removeEventListener('resize', updateTooltipPosition);
      // Clean up highlights on unmount
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, navigate]);

  const updateTooltipPosition = () => {
    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      let top, left, position = step.position;
      const tooltipWidth = 600;
      const tooltipHeight = 350; // Approximate height
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + windowHeight;
      
      // Force bottom position for first step (earnings card) - always
      if (step.target === '.stats-earnings') {
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + (rect.width / 2);
        position = 'bottom';
      } else if (step.position === 'bottom') {
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + (rect.width / 2);
        
        // Check if tooltip fits below in viewport
        const tooltipBottom = rect.bottom + tooltipHeight + 40;
        if (tooltipBottom > viewportBottom) {
          // Try above instead
          top = rect.top + scrollTop - tooltipHeight - 20;
          position = 'top';
        }
      } else if (step.position === 'top') {
        top = rect.top + scrollTop - tooltipHeight - 20;
        left = rect.left + scrollLeft + (rect.width / 2);
        
        // Check if tooltip fits above in viewport
        const tooltipTop = rect.top - tooltipHeight - 40;
        if (tooltipTop < viewportTop) {
          // Try below instead
          top = rect.bottom + scrollTop + 20;
          position = 'bottom';
        }
      } else if (step.position === 'right') {
        top = rect.top + scrollTop + (rect.height / 2);
        left = rect.right + scrollLeft + 20;
        position = 'right';
      } else if (step.position === 'left') {
        top = rect.top + scrollTop + (rect.height / 2);
        left = rect.left + scrollLeft - 20;
        position = 'left';
      }
      
      // Ensure tooltip doesn't go off-screen horizontally
      const halfTooltip = tooltipWidth / 2;
      if (left - halfTooltip < 10) {
        left = halfTooltip + 10;
      } else if (left + halfTooltip > windowWidth - 10) {
        left = windowWidth - halfTooltip - 10;
      }
      
      setTooltipPosition({ top, left, position });
      
      // Add highlight class
      element.classList.add('tour-highlight');
      
      return () => {
        element.classList.remove('tour-highlight');
      };
    }
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
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
              : tooltipPosition.position === 'top'
              ? 'translateX(-50%) translateY(-100%)'
              : tooltipPosition.position === 'right'
              ? 'translateY(-50%)'
              : 'translateX(-100%) translateY(-50%)',
            zIndex: 102,
            pointerEvents: 'auto'
          }}
          className="w-[600px] max-w-[calc(100vw-2rem)]"
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
            className={`absolute ${
              tooltipPosition.position === 'bottom' 
                ? 'left-1/2 -translate-x-1/2 -top-3' 
                : tooltipPosition.position === 'top'
                ? 'left-1/2 -translate-x-1/2 -bottom-3'
                : tooltipPosition.position === 'right'
                ? 'top-1/2 -translate-y-1/2 -left-3'
                : 'top-1/2 -translate-y-1/2 -right-3'
            }`}
          >
            <div 
              className={`w-0 h-0 ${
                tooltipPosition.position === 'bottom'
                  ? 'border-l-[12px] border-r-[12px] border-transparent border-b-[12px] border-b-[#41f2c0]'
                  : tooltipPosition.position === 'top'
                  ? 'border-l-[12px] border-r-[12px] border-transparent border-t-[12px] border-t-white'
                  : tooltipPosition.position === 'right'
                  ? 'border-t-[12px] border-b-[12px] border-transparent border-r-[12px] border-r-[#41f2c0]'
                  : 'border-t-[12px] border-b-[12px] border-transparent border-l-[12px] border-l-white'
              }`}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}