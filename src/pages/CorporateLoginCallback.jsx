import React, { useEffect, useState } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Esta página se ejecuta después de que el profesor premium inicia sesión
 * con su cuenta corporativa @menttio.com.
 * 
 * Flujo:
 * 1. Recuperar datos del sessionStorage (guardados antes del logout)
 * 2. Actualizar el registro Teacher para usar el email corporativo
 * 3. Crear sesión de Stripe y redirigir al pago
 */
export default function CorporateLoginCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Recuperar credenciales y datos guardados antes del logout
        const stored = sessionStorage.getItem('corporate_credentials');
        if (!stored) {
          throw new Error('No se encontraron datos de registro. Por favor vuelve a empezar.');
        }

        const { email: corporateEmail, teacher_id, signup_data, subscription_plan } = JSON.parse(stored);

        // Verificar que el usuario autenticado es la cuenta corporativa
        const user = await base44.auth.me();
        if (!user) {
          base44.auth.redirectToLogin(createPageUrl('CorporateLoginCallback'));
          return;
        }

        // Si el usuario no es aún el corporativo, esperar o redirigir a login
        if (user.email.toLowerCase() !== corporateEmail.toLowerCase()) {
          // Todavía con cuenta personal - redirigir al login de nuevo
          base44.auth.redirectToLogin(createPageUrl('CorporateLoginCallback'));
          return;
        }

        // Actualizar el Teacher para que use el email corporativo
        await base44.entities.Teacher.update(teacher_id, {
          user_email: corporateEmail,
        });

        // Limpiar sessionStorage
        sessionStorage.removeItem('corporate_credentials');
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('subscription_plan');
        sessionStorage.removeItem('teacher_signup_in_progress');

        // Crear sesión de Stripe y redirigir
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
          <a
            href={createPageUrl('TeacherSignup')}
            className="text-[#41f2c0] underline text-sm"
          >
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