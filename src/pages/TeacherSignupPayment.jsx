import React, { useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, Shield, Lock, Loader2, Mail, Copy, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherSignupPayment() {
  const [loading, setLoading] = useState(true);
  const [corporateCredentials, setCorporateCredentials] = useState(null);
  const [stripeUrl, setStripeUrl] = useState(null);
  const [copied, setCopied] = useState(null);

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

        // ── PLAN PREMIUM: guardar datos y redirigir al login ──
        // La cuenta corporativa se crea en CorporateLoginCallback (tras el login)
        if (subscription_plan === 'premium') {
          sessionStorage.setItem('corporate_credentials', JSON.stringify({
            signup_data: data,
            subscription_plan,
            pending_corporate: true,
          }));
          // Redirigir al login, volver a CorporateLoginCallback tras autenticarse
          base44.auth.redirectToLogin(createPageUrl('CorporateLoginCallback'));
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
          sessionStorage.removeItem('teacher_signup_data');
          sessionStorage.removeItem('subscription_plan');
          sessionStorage.removeItem('teacher_signup_in_progress');
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        // Verificar si ya usó el trial
        const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: user.email });
        const grantTrial = trialUsedRecords.length === 0;

        // Crear profesor
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

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
          subscription_plan,
          trial_used: !grantTrial,
          trial_active: grantTrial,
          trial_start_date: grantTrial ? now.toISOString().split('T')[0] : null,
          trial_end_date: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
          tour_completed: false
        };

        await base44.entities.Teacher.create(teacherData);

        if (grantTrial) {
          try {
            await base44.entities.TrialUsed.create({
              email: user.email,
              used_date: now.toISOString().split('T')[0]
            });
          } catch (e) { /* no crítico */ }
        }

        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor - Plan Básico - Menttio`,
            body: `<h2>Nuevo Profesor Registrado</h2><p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Teléfono:</strong> ${data.phone}</p><p><strong>Plan:</strong> ${subscription_plan}</p>`
          });
        } catch (e) { /* no crítico */ }

        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

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



  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (corporateCredentials) {
    const handleContinueWithCorporate = () => {
      // Cerrar sesión con cuenta personal y redirigir al login con la cuenta corporativa
      // Tras el login, se irá a CorporateLoginCallback que creará la suscripción Stripe
      const nextUrl = createPageUrl('CorporateLoginCallback');
      base44.auth.logout(nextUrl);
    };

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
                  Esta es tu cuenta para acceder a la plataforma Menttio. Al pulsar "Continuar", cerraremos tu sesión actual y deberás <strong>iniciar sesión con este email corporativo</strong> para completar el pago y acceder al dashboard.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Email corporativo</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[#404040] font-semibold break-all">{corporateCredentials.email}</p>
                    <button onClick={() => handleCopy(corporateCredentials.email, 'email')} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied === 'email' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Contraseña</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[#404040] font-semibold">{corporateCredentials.password}</p>
                    <button onClick={() => handleCopy(corporateCredentials.password, 'password')} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied === 'password' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleContinueWithCorporate}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12"
              >
                Continuar e iniciar sesión
                <ArrowRight size={18} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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