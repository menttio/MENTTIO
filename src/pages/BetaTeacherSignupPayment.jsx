import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const BETA_TRIAL_DAYS = 30;

export default function BetaTeacherSignupPayment() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const processSignup = async () => {
      try {
        const signupData = sessionStorage.getItem('teacher_signup_data');
        if (!signupData) {
          alert('Error: No se encontraron datos de registro. Vuelve al formulario.');
          window.location.href = createPageUrl('BetaTeacherSignup') + '?token=beta2024menttio';
          return;
        }

        const data = JSON.parse(signupData);

        // Verificar autenticación
        let user;
        try {
          user = await base44.auth.me();
        } catch {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        // Si ya existe un profesor con este email, redirigir al dashboard
        const existingTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (existingTeachers.length > 0) {
          const teacher = existingTeachers[0];
          if (teacher.subscription_active || teacher.trial_active || teacher.subscription_exempt) {
            sessionStorage.removeItem('teacher_signup_data');
            sessionStorage.removeItem('subscription_plan');
            sessionStorage.removeItem('teacher_signup_in_progress');
            window.location.href = createPageUrl('TeacherDashboard');
            return;
          }
        }

        // Verificar si ya usó cualquier trial (tanto beta como normal)
        const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: user.email });
        const grantTrial = trialUsedRecords.length === 0;

        // Calcular fechas de prueba (30 días para beta)
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + BETA_TRIAL_DAYS);

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
          subscription_plan: 'basic',
          trial_used: !grantTrial,
          trial_active: grantTrial,
          trial_start_date: grantTrial ? now.toISOString().split('T')[0] : null,
          trial_end_date: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
          tour_completed: false
        };

        if (existingTeachers.length > 0) {
          await base44.entities.Teacher.update(existingTeachers[0].id, teacherData);
        } else {
          await base44.entities.Teacher.create(teacherData);
        }

        // Enviar email de notificación
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor BETA - Menttio`,
            body: `<h2>Nuevo Profesor Beta Registrado</h2><p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Teléfono:</strong> ${data.phone}</p><p><strong>Plan:</strong> Básico (Beta — 30 días prueba)</p><p><strong>Trial hasta:</strong> ${grantTrial ? trialEndDate.toLocaleDateString('es-ES') : 'No aplica (ya usó trial)'}</p>`
          });
        } catch { /* no crítico */ }

        // Limpiar sessionStorage
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // Si tiene trial, ir directo al dashboard. Si no, ir a pago.
        if (grantTrial) {
          window.location.href = createPageUrl('TeacherDashboard');
        } else {
          const response = await base44.functions.invoke('createTeacherSubscription', { subscription_plan: 'basic' });
          if (response.data.error) throw new Error(response.data.error);
          window.location.replace(response.data.url);
        }

      } catch (err) {
        console.error('Error en BetaTeacherSignupPayment:', err);
        setError(err.message);
      }
    };

    processSignup();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <a href={createPageUrl('BetaTeacherSignup') + '?token=beta2024menttio'} className="text-[#41f2c0] underline">
            Volver al registro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <Loader2 className="animate-spin mx-auto mb-4 text-[#41f2c0]" size={48} />
        <h2 className="text-xl font-semibold text-[#404040] mb-2">Creando tu perfil de profesor...</h2>
        <p className="text-gray-600">Por favor espera un momento</p>
      </motion.div>
    </div>
  );
}