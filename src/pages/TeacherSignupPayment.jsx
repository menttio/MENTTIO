import React, { useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, Shield, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherSignupPayment() {
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Verificar si el usuario ya está autenticado y crear profesor + sesión de pago
  React.useEffect(() => {
    const checkAuthAndCreateSession = async () => {
      try {
        const user = await base44.auth.me();
        
        if (user) {
          console.log('✅ Usuario autenticado:', user.email);
          setAuthenticated(true);

          // Verificar si acabamos de volver del login
          const signupInProgress = sessionStorage.getItem('teacher_signup_in_progress');
          
          if (signupInProgress === 'true') {
            console.log('═══════════════════════════════════════════════════════');
            console.log('🔵 CREANDO PERFIL DE PROFESOR');
            console.log('═══════════════════════════════════════════════════════');
            
            setLoading(true);

            const signupData = sessionStorage.getItem('teacher_signup_data');
            const subscription_plan = sessionStorage.getItem('subscription_plan') || 'basic';
            
            if (!signupData) {
              console.error('❌ No hay datos de signup');
              alert('Error: Datos de registro no encontrados');
              return;
            }

            const data = JSON.parse(signupData);
            console.log('📋 Datos parseados:', data);
            console.log('📋 Plan:', subscription_plan);

            // Calcular fechas de prueba
            const trialStartDate = new Date();
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
              subscription_active: true,
              subscription_expires: trialEndDate.toISOString().split('T')[0],
              subscription_plan: subscription_plan,
              trial_used: false,
              trial_active: true,
              trial_start_date: trialStartDate.toISOString().split('T')[0],
              trial_end_date: trialEndDate.toISOString().split('T')[0],
              tour_completed: false
            };

            console.log('🔨 Creando profesor en BD...');
            const teacher = await base44.entities.Teacher.create(teacherData);
            console.log('✅ Profesor creado:', teacher.id);

            // Enviar email de notificación
            try {
              await base44.integrations.Core.SendEmail({
                to: 'menttio@menttio.com',
                subject: `Nuevo Profesor Registrado (Plan ${subscription_plan === 'basic' ? 'Básico' : 'Premium'}) - Menttio`,
                body: `
                  <h2>Nuevo Profesor Registrado - Plan ${subscription_plan === 'basic' ? 'Básico' : 'Premium'}</h2>
                  <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
                  <p><strong>Email:</strong> ${user.email}</p>
                  <p><strong>Teléfono:</strong> ${data.phone}</p>
                  <p><strong>Formación:</strong> ${data.education}</p>
                  <p><strong>Plan:</strong> ${subscription_plan === 'basic' ? 'Básico (sin grabaciones)' : 'Premium (con grabaciones)'}</p>
                `
              });
              console.log('✅ Email enviado');
            } catch (emailError) {
              console.error('❌ Error enviando email:', emailError);
            }

            if (subscription_plan === 'basic') {
              // Plan básico: ir directo al dashboard
              console.log('✅ Plan básico - Redirigiendo a dashboard...');
              
              sessionStorage.removeItem('teacher_signup_data');
              sessionStorage.removeItem('subscription_plan');
              sessionStorage.removeItem('teacher_signup_in_progress');
              
              window.location.href = createPageUrl('TeacherDashboard');
            } else {
              // Plan premium: crear sesión de Stripe
              console.log('🔵 Plan premium - Creando sesión de Stripe...');

              const response = await base44.functions.invoke('createTeacherSubscription', {
                subscription_plan
              });

              if (response.data.error) {
                throw new Error(response.data.error);
              }

              console.log('✅ Redirigiendo a Stripe...');
              window.location.href = response.data.url;
            }
          }
        }
      } catch (error) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ ERROR AL CREAR PERFIL');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ Error completo:', error);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Stack:', error.stack);
        console.error('═══════════════════════════════════════════════════════');
        alert(`Error al crear el perfil: ${error.message}\n\nRevisa la consola para más detalles.`);
        setLoading(false);
      }
    };

    checkAuthAndCreateSession();
  }, []);

  const handleContinue = async () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔵 TeacherSignupPayment - Iniciando flujo de pago');
    console.log('═══════════════════════════════════════════════════════');
    
    // Verificar que los datos estén guardados
    const signupData = sessionStorage.getItem('teacher_signup_data');
    console.log('📋 teacher_signup_data existe:', signupData ? 'SÍ' : 'NO');
    
    if (!signupData) {
      console.error('❌ ¡ERROR! No hay datos guardados');
      alert('Error: Los datos no se guardaron correctamente. Por favor, vuelve al inicio.');
      return;
    }

    // Marcar que hay un signup en progreso
    sessionStorage.setItem('teacher_signup_in_progress', 'true');

    try {
      setLoading(true);
      
      const subscription_plan = sessionStorage.getItem('subscription_plan') || 'basic';
      console.log('📋 Plan:', subscription_plan);
      console.log('🔐 Iniciando sesión con Google primero...');

      // Redirigir al login de Google con URL de retorno a esta misma página
      const nextUrl = window.location.href;
      console.log('🔗 URL de retorno:', nextUrl);
      
      base44.auth.redirectToLogin(nextUrl);
      
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al iniciar el proceso. Por favor, inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl">
          <CardContent className="p-8 md:p-12">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="text-blue-600" size={40} />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-[#404040] mb-3 text-center">
              Configura tu Método de Pago
            </h2>
            
            <p className="text-gray-600 mb-8 text-center">
              El siguiente paso es registrar tu tarjeta para la suscripción. No te preocupes, <strong>no se realizará ningún cargo durante los 14 días de prueba</strong>.
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#404040] mb-2 text-left">✨ 14 días de prueba GRATIS</h4>
                  <div className="text-sm text-gray-700 space-y-1 text-left">
                    <p>• Sin cargos durante el período de prueba</p>
                    <p>• Cancela cuando quieras sin costo</p>
                    <p>• Primer cobro: 1€ después de 14 días (precio de prueba)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lock className="text-blue-600 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-[#404040] mb-1 text-left">Pago 100% seguro</h4>
                  <p className="text-sm text-gray-600 text-left">
                    Procesamos los pagos a través de Stripe, la plataforma de pagos más segura del mundo. Tu información está protegida con encriptación de nivel bancario.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">💳</div>
                <div>
                  <h4 className="font-semibold text-[#404040] mb-1 text-left">Precio de Prueba</h4>
                  <p className="text-sm text-gray-600 text-left">
                    Para propósitos de testing, el precio está configurado en <strong>1€/mes</strong> en lugar del precio real. Puedes usar tu tarjeta real para probar el flujo completo de pago.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 text-left mb-2">
                <strong>📝 Pasos siguientes:</strong>
              </p>
              <ol className="text-sm text-gray-700 space-y-1 text-left list-decimal list-inside">
                <li>Inicia sesión con tu cuenta de Google</li>
                <li>Registra tu método de pago en Stripe</li>
                <li>¡Comienza tu prueba gratuita de 14 días!</li>
              </ol>
            </div>

            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Creando sesión...
                </>
              ) : (
                <>
                  Continuar a Configurar Pago
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Al continuar, serás redirigido a iniciar sesión con Google y luego a la pasarela de pago segura de Stripe.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}