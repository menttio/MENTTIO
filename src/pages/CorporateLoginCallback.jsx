import React, { useEffect, useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Mail, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Flujo premium:
 * 1. TeacherSignupPayment guarda datos en sessionStorage y redirige al login
 * 2. Usuario inicia sesión con su cuenta personal
 * 3. Esta página:
 *    a. Crea la cuenta corporativa @menttio.com
 *    b. Muestra las credenciales al usuario
 *    c. Usuario pulsa "Continuar" → cierra sesión → login
 * 4. Usuario inicia sesión con la cuenta @menttio.com
 * 5. Esta página detecta que ya tiene credenciales guardadas → crea Teacher → Stripe
 */
export default function CorporateLoginCallback() {
  const [phase, setPhase] = useState('loading'); // loading | show_credentials | processing | error
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const stored = localStorage.getItem('corporate_credentials');
        if (!stored) {
          setError('No se encontraron datos de registro. Por favor vuelve a empezar.');
          return;
        }

        const storedData = JSON.parse(stored);

        // FASE 1: pending_corporate = true → crear cuenta corporativa sin necesitar sesión
        if (storedData.pending_corporate) {
          // Crear la cuenta corporativa (no requiere autenticación)
          const corpResponse = await base44.functions.invoke('createCorporateUser', {
            nombre: storedData.signup_data.first_name,
            apellidos: storedData.signup_data.last_name,
            email_personal: storedData.signup_data.email_personal
          });

          if (!corpResponse.data?.email) {
            throw new Error('No se pudo crear la cuenta corporativa. Inténtalo de nuevo.');
          }

          // Actualizar sessionStorage con las credenciales reales
          sessionStorage.setItem('corporate_credentials', JSON.stringify({
            email: corpResponse.data.email,
            password: corpResponse.data.password,
            signup_data: storedData.signup_data,
            subscription_plan: storedData.subscription_plan,
            pending_corporate: false,
          }));

          setCredentials({
            email: corpResponse.data.email,
            password: corpResponse.data.password,
          });
          setPhase('show_credentials');
          return;
        }

        // FASE 2: ya tenemos credenciales → verificar que el usuario es la cuenta corporativa
        const { email: corporateEmail, signup_data, subscription_plan } = storedData;

        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!isAuthenticated) {
          base44.auth.redirectToLogin(createPageUrl('CorporateLoginCallback'));
          return;
        }

        const user = await base44.auth.me();

        if (user.email.toLowerCase() !== corporateEmail.toLowerCase()) {
          // Tiene sesión de otra cuenta → cerrar sesión y volver a esta página para re-login
          const cleanUrl = window.location.origin + window.location.pathname;
          base44.auth.logout(cleanUrl);
          return;
        }

        // ✅ Es la cuenta corporativa → crear el profesor
        setPhase('processing');

        const existing = await base44.entities.Teacher.filter({ user_email: corporateEmail });
        if (existing.length === 0) {
          const data = signup_data;
          const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: corporateEmail });
          const grantTrial = trialUsedRecords.length === 0;
          const now = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          await base44.entities.Teacher.create({
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

        sessionStorage.removeItem('corporate_credentials');
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        const stripeResp = await base44.functions.invoke('createTeacherSubscription', { subscription_plan });
        if (stripeResp.data.error) throw new Error(stripeResp.data.error);
        window.location.replace(stripeResp.data.url);

      } catch (err) {
        console.error('❌ Error en CorporateLoginCallback:', err);
        setError(err.message);
        setPhase('error');
      }
    };

    run();
  }, []);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContinue = () => {
    // Cerrar sesión actual y volver a esta misma página (URL limpia, sin parámetros OAuth).
    const cleanUrl = window.location.origin + window.location.pathname;
    base44.auth.logout(cleanUrl);
  };

  if (phase === 'show_credentials' && credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                  <Mail className="text-[#41f2c0]" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-[#404040] mb-2">¡Tu cuenta corporativa está lista!</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm font-medium mb-1">⚠️ Importante</p>
                <p className="text-blue-700 text-sm">
                  Copia estas credenciales. Al pulsar "Continuar", cerraremos tu sesión actual y deberás <strong>iniciar sesión con este email corporativo</strong> para completar el pago.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Email corporativo</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[#404040] font-semibold break-all">{credentials.email}</p>
                    <button onClick={() => handleCopy(credentials.email, 'email')} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied === 'email' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Contraseña</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[#404040] font-semibold">{credentials.password}</p>
                    <button onClick={() => handleCopy(credentials.password, 'password')} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied === 'password' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12">
                Continuar e iniciar sesión con cuenta corporativa
                <ArrowRight size={18} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (phase === 'error') {
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
        <h2 className="text-xl font-semibold text-[#404040] mb-2">
          {phase === 'processing' ? 'Preparando tu suscripción...' : 'Cargando...'}
        </h2>
        <p className="text-gray-500 text-sm">Por favor espera un momento</p>
      </motion.div>
    </div>
  );
}