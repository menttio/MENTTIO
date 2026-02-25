import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function TeacherSignupComplete() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const completeSignup = async () => {
      try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔵 TeacherSignupComplete INICIADO');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🌐 URL actual:', window.location.href);
        console.log('🌐 Timestamp:', new Date().toISOString());
        
        // Verificar sessionStorage COMPLETO
        console.log('📦 Contenido COMPLETO de sessionStorage AL INICIAR:');
        if (sessionStorage.length === 0) {
          console.error('❌ ¡sessionStorage está VACÍO!');
        } else {
          console.log('✅ sessionStorage tiene', sessionStorage.length, 'elementos:');
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            console.log(`  ${i + 1}. ${key} (${value?.length} chars):`, value);
          }
        }
        
        console.log('👤 Obteniendo usuario autenticado...');
        const user = await base44.auth.me();
        console.log('✅ Usuario autenticado:');
        console.log('  - Email:', user.email);
        console.log('  - ID:', user.id);
        console.log('  - Full Name:', user.full_name);
        console.log('  - Usuario completo:', user);
        
        const signupData = sessionStorage.getItem('teacher_signup_data');
        console.log('🔍 Verificando teacher_signup_data...');
        console.log('📋 teacher_signup_data encontrado:', signupData ? 'SÍ' : 'NO');
        
        if (!signupData) {
          console.error('❌❌❌ ERROR CRÍTICO: NO HAY teacher_signup_data ❌❌❌');
          console.error('❌ No se puede crear el profesor sin estos datos');
          console.error('❌ Redirigiendo de vuelta a TeacherSignup...');
          navigate(createPageUrl('TeacherSignup'));
          return;
        }

        console.log('📋 Datos raw encontrados (completos):', signupData);
        console.log('📄 Parseando datos JSON...');
        
        let data;
        try {
          data = JSON.parse(signupData);
          console.log('✅ Datos parseados exitosamente:', data);
        } catch (parseError) {
          console.error('❌ ERROR al parsear JSON:', parseError);
          console.error('❌ Contenido que falló:', signupData);
          throw parseError;
        }
        
        // Plan básico: 14 días de prueba gratuita
        console.log('📅 Calculando fechas de prueba...');
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        console.log('✅ Trial start:', trialStartDate.toISOString().split('T')[0]);
        console.log('✅ Trial end:', trialEndDate.toISOString().split('T')[0]);
        
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
          subscription_plan: 'basic',
          trial_used: false,
          trial_active: true,
          trial_start_date: trialStartDate.toISOString().split('T')[0],
          trial_end_date: trialEndDate.toISOString().split('T')[0],
          tour_completed: false
        };
        
        console.log('🔨 Preparando creación de Teacher...');
        console.log('🔨 Datos completos a enviar:', JSON.stringify(teacherData, null, 2));
        console.log('✅ Llamando a base44.entities.Teacher.create...');
        console.log('⏳ ESPERANDO RESPUESTA DEL SERVIDOR...');
        
        const teacher = await base44.entities.Teacher.create(teacherData);
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅✅✅ PROFESOR CREADO EXITOSAMENTE ✅✅✅');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ ID del profesor creado:', teacher.id);
        console.log('✅ Email del profesor:', teacher.user_email);
        console.log('✅ Nombre completo:', teacher.full_name);
        console.log('✅ Plan:', teacher.subscription_plan);
        console.log('✅ Trial activo:', teacher.trial_active);
        console.log('✅ Datos COMPLETOS del profesor creado:', JSON.stringify(teacher, null, 2));
        console.log('═══════════════════════════════════════════════════════');
        
        console.log('🔍 VERIFICANDO EN BASE DE DATOS...');
        console.log('🔍 Buscando profesor con email:', user.email);
        const verifyTeachers = await base44.entities.Teacher.filter({ user_email: user.email });
        console.log('🔍 Profesores encontrados en verificación:', verifyTeachers.length);
        if (verifyTeachers.length > 0) {
          console.log('✅ CONFIRMADO: Profesor existe en base de datos');
          console.log('✅ Datos encontrados:', verifyTeachers[0]);
        } else {
          console.error('❌ ERROR: Profesor NO encontrado en base de datos tras creación');
        }

        console.log('📧 Enviando email de notificación...');
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: 'Nuevo Profesor Registrado (Plan Básico) - Menttio',
            body: `
              <h2>Nuevo Profesor Registrado - Plan Básico</h2>
              <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Teléfono:</strong> ${data.phone}</p>
              <p><strong>Formación:</strong> ${data.education}</p>
              <p><strong>Años de experiencia:</strong> ${data.experience_years || 'No especificado'}</p>
              <p><strong>Plan:</strong> Básico (sin grabaciones)</p>
              <p><strong>Período de prueba:</strong> 14 días gratis (hasta ${trialEndDate.toLocaleDateString('es-ES')})</p>
            `
          });
          console.log('✅ Email enviado correctamente');
        } catch (emailError) {
          console.error('❌ Error enviando email de notificación:', emailError);
        }

        console.log('🗑️ Limpiando sessionStorage...');
        sessionStorage.removeItem('teacher_signup_data');
        sessionStorage.removeItem('post_login_redirect');
        sessionStorage.removeItem('teacher_signup_in_progress');
        console.log('✅ sessionStorage limpiado');
        
        console.log('➡️ Preparando redirección a TeacherDashboard...');
        const dashboardUrl = createPageUrl('TeacherDashboard');
        console.log('🔗 URL destino:', dashboardUrl);
        console.log('🚀 Redirigiendo...');
        console.log('═══════════════════════════════════════════════════════');
        
        window.location.href = dashboardUrl;
      } catch (error) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌❌❌ ERROR COMPLETANDO SIGNUP ❌❌❌');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ Mensaje de error:', error.message);
        console.error('❌ Error completo:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('═══════════════════════════════════════════════════════');
        setError(error.message);
      }
    };

    console.log('🚀 Ejecutando completeSignup...');
    completeSignup();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={() => navigate(createPageUrl('TeacherSignup'))}>
            Volver al registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f2f2f2] to-white">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#41f2c0] mx-auto mb-4" size={40} />
        <p className="text-gray-600">Completando tu registro como profesor...</p>
      </div>
    </div>
  );
}