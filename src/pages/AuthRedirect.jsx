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
          window.location.href = createPageUrl('Home');
          return;
        }

        // Check if there's a selected role from SelectRole page
        const selectedRole = sessionStorage.getItem('selected_role');
        const roleAction = sessionStorage.getItem('role_action');
        
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
              // Not a teacher - redirect to signup
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('TeacherSignup');
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
              // Not a student - redirect to signup
              sessionStorage.removeItem('selected_role');
              sessionStorage.removeItem('role_action');
              window.location.href = createPageUrl('StudentSignup');
              return;
            }
          }
        }
        
        // No role selected or old flow - check what account type exists
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        const students = await base44.entities.Student.filter({ user_email: user.email });
        if (students.length > 0) {
          window.location.href = createPageUrl('StudentDashboard');
          return;
        }

        // New user - redirect to role selection
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