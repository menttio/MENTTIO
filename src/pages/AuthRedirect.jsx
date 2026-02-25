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
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔵 AuthRedirect INICIADO');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🌐 URL actual:', window.location.href);
        console.log('🌐 URL params:', window.location.search);
        
        // Verificar sessionStorage COMPLETO al llegar
        console.log('📦 Estado COMPLETO de sessionStorage AL LLEGAR:');
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key);
          console.log(`  - ${key} (${value?.length} chars):`, value?.substring(0, 100));
        }
        
        console.log('👤 Obteniendo usuario autenticado...');
        const user = await base44.auth.me();
        
        if (!user) {
          console.log('❌ No hay usuario, redirigiendo a Home');
          window.location.href = createPageUrl('Home');
          return;
        }

        console.log('👤 Usuario autenticado:', user.email);
        console.log('👤 Usuario ID:', user.id);

        // CRITICAL: Check if this is a teacher signup in progress
        const teacherSignupInProgress = sessionStorage.getItem('teacher_signup_in_progress');
        const teacherSignupData = sessionStorage.getItem('teacher_signup_data');
        
        console.log('🔍 VERIFICANDO SIGNUP EN PROGRESO:');
        console.log('  - teacher_signup_in_progress:', teacherSignupInProgress);
        console.log('  - teacher_signup_data exists:', teacherSignupData ? 'SÍ' : 'NO');
        
        if (teacherSignupData) {
          console.log('  - teacher_signup_data content (100 chars):', teacherSignupData.substring(0, 100));
        }
        
        if (teacherSignupInProgress === 'true' && teacherSignupData) {
          console.log('✅✅✅ SIGNUP DE PROFESOR EN PROGRESO DETECTADO ✅✅✅');
          console.log('➡️ Redirigiendo a TeacherSignupComplete para crear el profesor...');
          console.log('🔗 URL destino:', createPageUrl('TeacherSignupComplete'));
          
          // NO borrar teacher_signup_data, solo el flag de in_progress
          sessionStorage.removeItem('teacher_signup_in_progress');
          console.log('🗑️ Flag teacher_signup_in_progress eliminado');
          console.log('✅ teacher_signup_data MANTENIDO en sessionStorage');
          
          console.log('═══════════════════════════════════════════════════════');
          window.location.href = createPageUrl('TeacherSignupComplete');
          return;
        } else {
          console.log('❌ NO hay signup en progreso');
          if (!teacherSignupInProgress) {
            console.log('❌ Razón: teacher_signup_in_progress no existe o no es "true"');
          }
          if (!teacherSignupData) {
            console.log('❌ Razón: teacher_signup_data no existe');
          }
          console.log('➡️ Continuando con flujo normal de redirección...');
        }

        // Check if there's a selected role from SelectRole page
        const selectedRole = sessionStorage.getItem('selected_role');
        const roleAction = sessionStorage.getItem('role_action');
        console.log('🔍 Selected role:', selectedRole, '- Action:', roleAction);
        
        if (selectedRole && roleAction === 'login') {
          // User is trying to login with a specific role
          if (selectedRole === 'teacher') {
            const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
            if (teachers.length > 0) {
              // Teacher account found
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('TeacherDashboard');
              return;
            } else {
              // Not a teacher - redirect to warning page
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('UserNotRegistered');
              return;
            }
          } else if (selectedRole === 'student') {
            const students = await base44.entities.Student.filter({ user_email: user.email });
            if (students.length > 0) {
              // Student account found
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('StudentDashboard');
              return;
            } else {
              // Not a student - redirect to warning page
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('UserNotRegistered');
              return;
            }
          }
        }
        
        // No role selected or old flow - check what account type exists
        console.log('🔍 Buscando perfiles existentes para:', user.email);
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        console.log('📋 Profesores encontrados:', teachers.length);
        
        if (teachers.length > 0) {
          console.log('✅ Profesor encontrado, redirigiendo a TeacherDashboard');
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        const students = await base44.entities.Student.filter({ user_email: user.email });
        console.log('📋 Estudiantes encontrados:', students.length);
        
        if (students.length > 0) {
          console.log('✅ Estudiante encontrado, redirigiendo a StudentDashboard');
          window.location.href = createPageUrl('StudentDashboard');
          return;
        }

        // New user - redirect to warning page
        console.log('❌ No se encontró ningún perfil, redirigiendo a UserNotRegistered');
        window.location.href = createPageUrl('UserNotRegistered');
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