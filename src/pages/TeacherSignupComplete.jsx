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
        if (!user) {
          window.location.href = createPageUrl('Home');
          return;
        }

        const signupData = sessionStorage.getItem('teacher_signup_data');
        const subscriptionPlan = sessionStorage.getItem('subscription_plan') || 'basic';

        if (!signupData) {
          navigate(createPageUrl('TeacherSignup'));
          return;
        }

        const data = JSON.parse(signupData);

        // Verificar si ya existe el profesor (por si el usuario recargó la página)
        const existingTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (existingTeachers.length > 0) {
          const teacher = existingTeachers[0];
          if (teacher.subscription_active || teacher.trial_active || teacher.subscription_exempt) {
            // Ya tiene acceso → ir directo al dashboard
            sessionStorage.removeItem('teacher_signup_data');
            sessionStorage.removeItem('subscription_plan');
            sessionStorage.removeItem('teacher_signup_in_progress');
            window.location.href = createPageUrl('TeacherDashboard');
            return;
          }
          // Existe pero sin suscripción → ir a pagar
          sessionStorage.removeItem('teacher_signup_data');
          sessionStorage.removeItem('subscription_plan');
          sessionStorage.removeItem('teacher_signup_in_progress');
          const response = await base44.functions.invoke('createTeacherSubscription', { subscription_plan: subscriptionPlan });
          if (response.data.error) throw new Error(response.data.error);
          window.location.replace(response.data.url);
          return;
        }

        // Verificar si ya usó el trial
        const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: user.email });
        const grantTrial = trialUsedRecords.length === 0;

        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const teacherData = {
          user_email: user.email,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          education: data.education,
          experience_years: data.experience_years,
          bio: '',
          subjects: data.subjects || [],
          rating: 0,
          total_classes: 0,
          subscription_active: grantTrial,
          subscription_expires: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
          subscription_plan: subscriptionPlan,
          trial_used: !grantTrial,
          trial_active: grantTrial,
          trial_start_date: grantTrial ? now.toISOString().split('T')[0] : null,
          trial_end_date: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
          tour_completed: false
        };

        await base44.entities.Teacher.create(teacherData);

        // Notificar a n8n vía función backend (POST seguro)
        try {
          await base44.functions.invoke('notifyNuevoProfesor', {
            nombre: data.first_name,
            apellidos: data.last_name,
            telefono: data.phone,
            correo_electronico: user.email
          });
        } catch (e) { /* no crítico */ }

        // Email de notificación interna
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor - Plan ${subscriptionPlan === 'premium' ? 'Premium' : 'Básico'} - Menttio`,
            body: `<h2>Nuevo Profesor Registrado</h2><p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Teléfono:</strong> ${data.phone}</p><p><strong>Plan:</strong> ${subscriptionPlan}</p>`
          });
        } catch (e) { /* no crítico */ }

        // Limpiar sessionStorage
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // Siempre pasar por Stripe para registrar el método de pago
        const response = await base44.functions.invoke('createTeacherSubscription', { subscription_plan: subscriptionPlan });
        if (response.data.error) throw new Error(response.data.error);
        window.location.replace(response.data.url);

      } catch (error) {
        console.error('Error completando signup de profesor:', error.message);
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