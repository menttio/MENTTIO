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
        
        console.log('📋 teacher_signup_data:', signupData ? 'EXISTE' : 'NO EXISTE');
        console.log('📋 Plan:', subscription_plan);

        if (!signupData) {
          console.error('❌ NO HAY DATOS DE REGISTRO');
          alert('Error: No se encontraron datos de registro. Vuelve al formulario.');
          window.location.href = createPageUrl('TeacherSignup');
          return;
        }

        // 2. Verificar autenticación
        let user;
        try {
          user = await base44.auth.me();
          console.log('✅ Usuario autenticado:', user.email);
        } catch (authError) {
          console.log('⚠️ Usuario NO autenticado');
          console.log('🔐 Redirigiendo a login...');
          
          const nextUrl = window.location.href;
          base44.auth.redirectToLogin(nextUrl);
          return;
        }

        // 3. Verificar si ya existe un profesor con este email
        console.log('🔍 Verificando si ya existe profesor...');
        const existingTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
        
        if (existingTeachers.length > 0) {
          console.log('⚠️ Ya existe un profesor con este email');
          console.log('✅ Redirigiendo al dashboard...');
          
          sessionStorage.removeItem('teacher_signup_data');
          sessionStorage.removeItem('subscription_plan');
          sessionStorage.removeItem('teacher_signup_in_progress');
          
          window.location.href = createPageUrl('TeacherDashboard');
          return;
        }

        // 3b. Verificar si este email ya usó el trial gratuito anteriormente
        console.log('🔍 Verificando si ya usó el trial...');
        const trialUsedRecords = await base44.entities.TrialUsed.filter({ email: user.email });
        const hasUsedTrialBefore = trialUsedRecords.length > 0;
        console.log('Trial usado antes:', hasUsedTrialBefore);

        // 4. Crear profesor
        console.log('🔨 CREANDO PROFESOR EN BASE DE DATOS...');
        
        const data = JSON.parse(signupData);
        console.log('📋 Datos parseados:', data);

        const now = new Date();
        const trialStartDate = now;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        // Si ya usó el trial, no dar período de prueba - suscripción inactiva hasta pagar
        const grantTrial = !hasUsedTrialBefore;

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
          subscription_plan: subscription_plan,
          trial_used: !grantTrial,
          trial_active: grantTrial,
          trial_start_date: grantTrial ? trialStartDate.toISOString().split('T')[0] : null,
          trial_end_date: grantTrial ? trialEndDate.toISOString().split('T')[0] : null,
          tour_completed: false
        };

        console.log('💾 Datos del profesor a crear:', teacherData);

        const teacher = await base44.entities.Teacher.create(teacherData);
        console.log('✅✅✅ PROFESOR CREADO EXITOSAMENTE ✅✅✅');
        console.log('📋 ID del profesor:', teacher.id);

        // Registrar TrialUsed inmediatamente al crear la cuenta con trial
        if (grantTrial) {
          try {
            await base44.entities.TrialUsed.create({
              email: user.email,
              used_date: new Date().toISOString().split('T')[0]
            });
            console.log('✅ Email registrado en TrialUsed inmediatamente');
          } catch (trialErr) {
            console.error('⚠️ Error registrando TrialUsed:', trialErr);
          }
        }

        // 5b. Si el plan es premium, crear cuenta corporativa @menttio.com
        if (subscription_plan === 'premium') {
          console.log('🏢 Creando cuenta corporativa @menttio.com...');
          const corpResponse = await base44.functions.invoke('createCorporateUser', {
            nombre: data.first_name,
            apellidos: data.last_name
          });
          if (corpResponse.data?.email) {
            await base44.entities.Teacher.update(teacher.id, {
              corporate_email: corpResponse.data.email
            });
            console.log('✅ Cuenta corporativa creada:', corpResponse.data.email);

            // Guardar credenciales + datos de registro para recuperar tras login corporativo
            sessionStorage.setItem('corporate_credentials', JSON.stringify({
              email: corpResponse.data.email,
              password: corpResponse.data.password,
              teacher_id: teacher.id,
              signup_data: data,
              subscription_plan,
            }));

            // Mostrar pantalla de credenciales (el usuario debe iniciar sesión con la cuenta corporativa)
            setCorporateCredentials({
              email: corpResponse.data.email,
              password: corpResponse.data.password,
            });
            setLoading(false);
            return;
          }
        }

        // 5. Enviar email (plan basic)
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor - Plan Básico - Menttio`,
            body: `
              <h2>Nuevo Profesor Registrado</h2>
              <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Teléfono:</strong> ${data.phone}</p>
              <p><strong>Plan:</strong> ${subscription_plan}</p>
            `
          });
        } catch (emailError) {
          console.error('⚠️ Error al enviar email (no crítico):', emailError);
        }

        // 6. Limpiar sessionStorage
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // 7. Redirigir a Stripe (plan basic)
        console.log('💳 Redirigiendo a Stripe...');
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
              <p className="text-gray-500 text-center mb-6 text-sm">
                Guarda estas credenciales antes de continuar. Las necesitarás para acceder a tu cuenta <strong>@menttio.com</strong>.
              </p>

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
                onClick={() => window.location.replace(stripeUrl)}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12"
              >
                Continuar al pago
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