import React, { useEffect, useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Flujo premium:
 * 1. TeacherSignupPayment llama a createCorporateUser → n8n crea la cuenta → guarda {email, pending_corporate:false}
 * 2. Redirige aquí → no hay sesión → muestra pantalla "revisa tu correo e inicia sesión"
 * 3. Usuario inicia sesión con la cuenta @menttio.com que recibió por email
 * 4. Vuelve aquí con sesión activa → verifica email → crea Teacher → Stripe
 */
export default function CorporateLoginCallback() {
  const [phase, setPhase] = useState('loading'); // loading | show_credentials | processing | error
  const [corporateEmail, setCorporateEmail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const stored = localStorage.getItem('corporate_credentials');
        if (!stored) {
          setError('No se encontraron datos de registro. Por favor vuelve a empezar.');
          setPhase('error');
          return;
        }

        const storedData = JSON.parse(stored);

        // CASO LEGACY: pending_corporate=true → la cuenta todavía no fue creada
        // (compatibilidad con flujos anteriores)
        if (storedData.pending_corporate) {
          const corpResponse = await base44.functions.invoke('createCorporateUser', {
            nombre: storedData.signup_data.first_name,
            apellidos: storedData.signup_data.last_name,
            email_personal: storedData.signup_data.email_personal
          });

          if (!corpResponse.data?.email) {
            throw new Error('No se pudo crear la cuenta corporativa. Inténtalo de nuevo.');
          }

          const updatedData = {
            email: corpResponse.data.email,
            signup_data: storedData.signup_data,
            subscription_plan: storedData.subscription_plan,
            pending_corporate: false,
          };
          localStorage.setItem('corporate_credentials', JSON.stringify(updatedData));
          setCorporateEmail(corpResponse.data.email);
          setPhase('show_credentials');
          return;
        }

        // CASO NORMAL: cuenta ya creada por TeacherSignupPayment
        const { email: corpEmail, signup_data, subscription_plan } = storedData;

        const isAuthenticated = await base44.auth.isAuthenticated();

        // Sin sesión → mostrar pantalla "revisa tu correo e inicia sesión"
        if (!isAuthenticated) {
          setCorporateEmail(corpEmail);
          setPhase('show_credentials');
          return;
        }

        // Con sesión → verificar que es la cuenta corporativa correcta
        const user = await base44.auth.me();
        console.log('👤 Usuario autenticado:', user.email, '| Esperado:', corpEmail);

        if (user.email.toLowerCase() !== corpEmail.toLowerCase()) {
          // Sesión de otra cuenta → logout y redirigir al login para que inicie con la corporativa
          console.log('🔄 Email no coincide, haciendo logout y redirigiendo al login');
          setCorporateEmail(corpEmail);
          setPhase('show_credentials');
          return;
        }

        // ✅ Cuenta corporativa verificada → crear Teacher y Stripe
        setPhase('processing');

        const existing = await base44.entities.Teacher.filter({ user_email: corpEmail });
        if (existing.length === 0) {
          const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: corpEmail });
          const grantTrial = trialUsedRecords.length === 0;
          const now = new Date();
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);

          await base44.entities.Teacher.create({
            user_email: corpEmail,
            corporate_email: corpEmail,
            full_name: `${signup_data.first_name} ${signup_data.last_name}`,
            phone: signup_data.phone,
            education: signup_data.education,
            experience_years: signup_data.experience_years,
            bio: '',
            subjects: signup_data.subjects || [],
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
                email: corpEmail,
                used_date: now.toISOString().split('T')[0]
              });
            } catch (e) { /* no crítico */ }
          }
        }

        try {
          await base44.functions.invoke('notifyNuevoProfesor', {
            nombre: signup_data.first_name,
            apellidos: signup_data.last_name,
            telefono: signup_data.phone,
            correo_electronico: signup_data.email_personal
          });
        } catch (e) { console.error('Error notifyNuevoProfesor:', e.message); }

        localStorage.removeItem('corporate_credentials');
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

  const handleLogin = async () => {
    // Cerrar sesión actual (si hay) y redirigir al login con retorno a esta página
    const callbackUrl = '/CorporateLoginCallback';
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      base44.auth.logout(window.location.origin + callbackUrl);
    } else {
      base44.auth.redirectToLogin(callbackUrl);
    }
  };

  if (phase === 'show_credentials') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#41f2c0]/20 flex items-center justify-center">
                  <Mail className="text-[#41f2c0]" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-[#404040] mb-3">¡Cuenta creada!</h2>
              <p className="text-gray-600 text-sm mb-4">
                Hemos enviado tus credenciales de acceso a tu <strong>correo personal</strong>. Revisa tu bandeja de entrada.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Una vez tengas tus credenciales, inicia sesión con tu cuenta corporativa <strong>{corporateEmail || '@menttio.com'}</strong> para completar el registro.
              </p>
              <Button
                onClick={handleLogin}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12"
              >
                Iniciar sesión con mi cuenta corporativa
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
          {phase === 'processing' ? 'Preparando tu suscripción...' : 'Configurando tu cuenta...'}
        </h2>
        <p className="text-gray-500 text-sm">Por favor espera un momento</p>
      </motion.div>
    </div>
  );
}