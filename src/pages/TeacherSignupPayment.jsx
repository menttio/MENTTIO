import React from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, Shield, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherSignupPayment() {
  const handleContinue = () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔵 TeacherSignupPayment - Botón Continuar clickeado');
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
    console.log('✅ Marcando teacher_signup_in_progress...');
    sessionStorage.setItem('teacher_signup_in_progress', 'true');
    
    const nextUrl = createPageUrl('TeacherSignupComplete');
    console.log('🔗 URL de redirección tras login:', nextUrl);
    console.log('🚀 Redirigiendo a login...');
    console.log('═══════════════════════════════════════════════════════');
    
    base44.auth.redirectToLogin(nextUrl);
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
                    <p>• Primer cobro: 1€ después de 14 días</p>
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

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 text-left mb-2">
                <strong>📝 Pasos siguientes:</strong>
              </p>
              <ol className="text-sm text-gray-700 space-y-1 text-left list-decimal list-inside">
                <li>Inicia sesión con tu cuenta de Google</li>
                <li>Registra tu método de pago (tarjeta)</li>
                <li>¡Comienza tu prueba gratuita de 14 días!</li>
              </ol>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg"
            >
              Continuar a Configurar Pago
              <ArrowRight size={18} className="ml-2" />
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