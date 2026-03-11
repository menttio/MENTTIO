import React, { useEffect, useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Flujo premium:
 * 1. TeacherSignupPayment crea la cuenta corporativa y guarda datos en sessionStorage
 * 2. Usuario inicia sesión con la cuenta @menttio.com
 * 3. Esta página:
 *    a. Si no hay sesión → redirigir al login
 *    b. Si hay sesión pero NO es la corporativa → cerrar sesión y redirigir al login
 *    c. Si es la cuenta corporativa → crear Teacher + ir a Stripe
 */
export default function CorporateLoginCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const stored = sessionStorage.getItem('corporate_credentials');
        if (!stored) {
          setError('No se encontraron datos de registro. Por favor vuelve a empezar.');
          return;
        }

        const { email: corporateEmail, signup_data, subscription_plan } = JSON.parse(stored);

        // Verificar si hay sesión activa
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!isAuthenticated) {
          base44.auth.redirectToLogin(createPageUrl('CorporateLoginCallback'));
          return;
        }

        const user = await base44.auth.me();

        // Si aún tiene la sesión de otra cuenta → cerrar sesión
        if (user.email.toLowerCase() !== corporateEmail.toLowerCase()) {
          base44.auth.logout(createPageUrl('CorporateLoginCallback'));
          return;
        }

        // ✅ Es la cuenta corporativa → crear el profesor

        // Verificar si ya existe (en caso de recarga)
        const existing = await base44.entities.Teacher.filter({ user_email: corporateEmail });
        let teacher;
        if (existing.length > 0) {
          teacher = existing[0];
        } else {
          const data = signup_data;
          const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: corporateEmail });
          const grantTrial = trialUsedRecords.length === 0;

          const now = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          teacher = await base44.entities.Teacher.create({
            user_email: corporateEmail,
            corporate_email: corporateEmail,
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
            subscription_plan,
            trial_used: !grantTrial,
            trial_active: grantTrial,
            trial_start_date: grantTrial ? now.toISOString().split('T')[0] : null,
            trial_end_date: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
            tour_completed: false
          });

          if (grantTrial) {
            try {
              await base44.entities.TrialUsed.create({
                email: corporateEmail,
                used_date: now.toISOString().split('T')[0]
              });
            } catch (e) { /* no crítico */ }
          }
        }

        // Limpiar sessionStorage
        sessionStorage.removeItem('corporate_credentials');
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // Ir a Stripe
        const stripeResp = await base44.functions.invoke('createTeacherSubscription', { subscription_plan });
        if (stripeResp.data.error) throw new Error(stripeResp.data.error);
        window.location.replace(stripeResp.data.url);

      } catch (err) {
        console.error('❌ Error en CorporateLoginCallback:', err);
        setError(err.message);
      }
    };

    run();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#404040] mb-2">Ha ocurrido un error</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <a href={createPageUrl('TeacherSignup')} className="text-[#41f2c0] underline text-sm">
            Volver al formulario de registro
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <Loader2 className="animate-spin text-[#41f2c0] mx-auto mb-4" size={48} />
        <h2 className="text-xl font-semibold text-[#404040] mb-2">Preparando tu suscripción...</h2>
        <p className="text-gray-500 text-sm">Por favor espera un momento</p>
      </motion.div>
    </div>
  );
}