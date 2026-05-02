import React, { useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherSignupPayment() {
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const processSignup = async () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔵 TeacherSignupPayment - INICIANDO');
      console.log('═══════════════════════════════════════════════════════');

      try {
        // 1. Verificar datos de registro
        const signupData = sessionStorage.getItem('teacher_signup_data');
        const subscription_plan = sessionStorage.getItem('subscription_plan') || 'basic';

        if (!signupData) {
          alert('Error: No se encontraron datos de registro. Vuelve al formulario.');
          window.location.href = createPageUrl('TeacherSignup');
          return;
        }

        const data = JSON.parse(signupData);

        // ── PLAN PREMIUM: crear cuenta corporativa vía n8n y mostrar pantalla "revisa tu correo" ──
        if (subscription_plan === 'premium') {
          // 1. Llamar a n8n para crear la cuenta corporativa
          const corpResponse = await base44.functions.invoke('createCorporateUser', {
            nombre: data.first_name,
            apellidos: data.last_name,
            email_personal: data.email_personal
          });

          if (!corpResponse.data?.email) {
            throw new Error(corpResponse.data?.error || 'No se pudo crear la cuenta corporativa.');
          }

          // 2. Guardar el email corporativo (sin contraseña) para que CorporateLoginCallback
          //    sepa qué cuenta esperar cuando el usuario inicie sesión
          localStorage.setItem('corporate_credentials', JSON.stringify({
            email: corpResponse.data.email,
            signup_data: data,
            subscription_plan,
            pending_corporate: false,
            expires_at: Date.now() + 60 * 60 * 1000 // TTL: 60 minutos
          }));

          // 3. Mostrar pantalla "revisa tu correo" → el usuario inicia sesión manualmente
          window.location.href = createPageUrl('CorporateLoginCallback');
          return;
        }

        // ── PLAN BASIC: flujo normal con login personal ──

        // Verificar autenticación
        let user;
        try {
          user = await base44.auth.me();
        } catch (authError) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        // Verificar si ya existe un profesor con este email
        const existingTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (existingTeachers.length > 0) {
          const teacher = existingTeachers[0];
          // Si ya tiene suscripción activa o trial, redirigir al dashboard
          if (teacher.subscription_active || teacher.trial_active || teacher.subscription_exempt) {
            sessionStorage.removeItem('teacher_signup_data');
            sessionStorage.removeItem('subscription_plan');
            sessionStorage.removeItem('teacher_signup_in_progress');
            window.location.href = createPageUrl('TeacherDashboard');
            return;
          }
          // Si existe pero no tiene suscripción activa, continuar con el pago
        }

        // Verificar si ya usó el trial
        const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: user.email });
        const grantTrial = trialUsedRecords.length === 0;

        // Crear profesor
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const isCommission = subscription_plan === 'commission';
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
          subscription_active: isCommission ? true : grantTrial,
          subscription_expires: isCommission ? null : (grantTrial ? trialEndDate.toISOString().split('T')[0] : null),
          subscription_plan,
          commission_percentage: isCommission ? 25 : undefined,
          trial_used: isCommission ? false : !grantTrial,
          trial_active: isCommission ? false : grantTrial,
          trial_start_date: isCommission ? null : (grantTrial ? now.toISOString().split('T')[0] : null),
          trial_end_date: isCommission ? null : (grantTrial ? trialEndDate.toISOString().split('T')[0] : null),
          tour_completed: false
        };

        await base44.entities.Teacher.create(teacherData);

        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor - Plan ${subscription_plan === 'premium' ? 'Premium' : 'Básico'} - Menttio`,
            body: `<h2>Nuevo Profesor Registrado</h2><p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Teléfono:</strong> ${data.phone}</p><p><strong>Plan:</strong> ${subscription_plan}</p>`
          });
        } catch (e) { /* no crítico */ }

        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // Plan commission: no Stripe needed, go directly to dashboard
        if (subscription_plan === 'commission') {
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        const response = await base44.functions.invoke('createTeacherSubscription', { subscription_plan });
        if (response.data.error) throw new Error(response.data.error);
        window.location.replace(response.data.url);

      } catch (error) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌❌❌ ERROR CRÍTICO ❌❌❌');
        console.error('═══════════════════════════════════════════════════════');
        console.error('Error completo:', error);
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════════════════');
        
        setLoading(false);
        alert(`Error al crear el perfil del profesor:\n\n${error.message}\n\nPor favor, contacta con soporte o revisa la consola.`);
      }
    };

    processSignup();
  }, []);






  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="animate-spin mx-auto mb-4 text-[#41f2c0]" size={48} />
          <h2 className="text-xl font-semibold text-[#404040] mb-2">
            Creando tu perfil de profesor...
          </h2>
          <p className="text-gray-600">
            Por favor espera un momento
          </p>
        </motion.div>
      </div>
    );
  }

  return null;
}