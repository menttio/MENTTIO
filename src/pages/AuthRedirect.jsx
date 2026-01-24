import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const determineRedirect = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user) {
          // No hay usuario, volver a home
          window.location.href = createPageUrl('Home');
          return;
        }

        // Verificar si es profesor
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          // Es profesor - redirigir a dashboard de profesor
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        // Verificar si es alumno
        const students = await base44.entities.Student.filter({ user_email: user.email });
        if (students.length > 0) {
          // Es alumno - redirigir a dashboard de alumno
          window.location.href = createPageUrl('StudentDashboard');
          return;
        }

        // No tiene rol - redirigir a selección de rol
        window.location.href = createPageUrl('SelectRole');
      } catch (error) {
        console.error('Error determining redirect:', error);
        window.location.href = createPageUrl('Home');
      }
    };

    determineRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#41f2c0] mx-auto mb-4" size={48} />
        <p className="text-[#404040] text-lg">Redirigiendo...</p>
      </div>
    </div>
  );
}