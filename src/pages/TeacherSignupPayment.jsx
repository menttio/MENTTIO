import React, { useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, Shield, Lock, Loader2, Mail, Copy, CheckCircle } from 'lucide-react';
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
          try {
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
            }
          } catch (corpError) {
            console.error('⚠️ Error creando cuenta corporativa (no crítico):', corpError);
          }
        }

        // 5. Enviar email
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: `Nuevo Profesor - ${subscription_plan === 'basic' ? 'Plan Básico' : 'Plan Premium'} - Menttio`,
            body: `
              <h2>Nuevo Profesor Registrado</h2>
              <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Teléfono:</strong> ${data.phone}</p>
              <p><strong>Plan:</strong> ${subscription_plan}</p>
            `
          });
          console.log('✅ Email enviado');
        } catch (emailError) {
          console.error('⚠️ Error al enviar email (no crítico):', emailError);
        }

        // 6. Limpiar sessionStorage
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // 7. Redirigir a Stripe para configurar método de pago (siempre, con o sin trial)
        console.log('💳 Redirigiendo a Stripe para configurar método de pago...');
        console.log('📋 Plan seleccionado:', subscription_plan);
        console.log('🎁 ¿Con trial?', grantTrial);
        
        const response = await base44.functions.invoke('createTeacherSubscription', {
          subscription_plan
        });
        
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        console.log('✅ Sesión de Stripe creada, redirigiendo...');
        // Redirigir directamente a Stripe sin pasar por el dashboard
        // (evita que el Layout intercepte al profesor sin suscripción activa)
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