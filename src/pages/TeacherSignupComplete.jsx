import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function TeacherSignupComplete() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const completeSignup = async () => {
      try {
        const user = await base44.auth.me();
        const signupData = sessionStorage.getItem('teacher_signup_data');
        
        if (!signupData) {
          navigate(createPageUrl('TeacherSignup'));
          return;
        }

        const data = JSON.parse(signupData);
        
        // Plan básico: 14 días de prueba gratuita
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        
        await base44.entities.Teacher.create({
          user_email: user.email,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          education: data.education,
          experience_years: data.experience_years,
          bio: '',
          subjects: data.subjects || [],
          rating: 0,
          total_classes: 0,
          subscription_active: true,
          subscription_expires: trialEndDate.toISOString().split('T')[0],
          subscription_plan: 'basic',
          trial_used: false,
          trial_active: true,
          trial_start_date: trialStartDate.toISOString().split('T')[0],
          trial_end_date: trialEndDate.toISOString().split('T')[0],
          tour_completed: false
        });

        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: 'Nuevo Profesor Registrado (Plan Básico) - Menttio',
            body: `
              <h2>Nuevo Profesor Registrado - Plan Básico</h2>
              <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Teléfono:</strong> ${data.phone}</p>
              <p><strong>Formación:</strong> ${data.education}</p>
              <p><strong>Años de experiencia:</strong> ${data.experience_years || 'No especificado'}</p>
              <p><strong>Plan:</strong> Básico (sin grabaciones)</p>
              <p><strong>Período de prueba:</strong> 14 días gratis (hasta ${trialEndDate.toLocaleDateString('es-ES')})</p>
            `
          });
        } catch (emailError) {
          console.error('Error enviando email de notificación:', emailError);
        }

        sessionStorage.removeItem('teacher_signup_data');
        window.location.href = createPageUrl('TeacherDashboard');
      } catch (error) {
        console.error('Error completing signup:', error);
        setError(error.message);
      }
    };

    completeSignup();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={() => navigate(createPageUrl('TeacherSignup'))}>
            Volver al registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-white">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#41f2c0] mx-auto mb-4" size={40} />
        <p className="text-gray-600">Completando tu registro como profesor...</p>
      </div>
    </div>
  );
}