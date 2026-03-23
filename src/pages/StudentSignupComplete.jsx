import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function StudentSignupComplete() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const completeSignup = async () => {
      try {
        const user = await base44.auth.me();
        const signupData = sessionStorage.getItem('student_signup_data');
        
        if (!signupData) {
          navigate(createPageUrl('StudentSignup'));
          return;
        }

        const data = JSON.parse(signupData);
        
        await base44.entities.Student.create({
          user_email: user.email,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          assigned_teachers: []
        });

        // Notificar nuevo alumno a n8n
        try {
          const nuevoAlumnoUrl = new URL('https://raulng16.app.n8n.cloud/webhook/nuevo_alumno');
          nuevoAlumnoUrl.searchParams.append('nombre', data.first_name);
          nuevoAlumnoUrl.searchParams.append('apellidos', data.last_name);
          nuevoAlumnoUrl.searchParams.append('telefono', data.phone);
          nuevoAlumnoUrl.searchParams.append('correo_electronico', user.email);
          await fetch(nuevoAlumnoUrl.toString(), { method: 'GET' });
        } catch (webhookErr) {
          console.error('Error enviando webhook nuevo_alumno:', webhookErr.message);
        }

        // Enviar email de notificación a menttio
        try {
          await base44.integrations.Core.SendEmail({
            to: 'menttio@menttio.com',
            subject: 'Nuevo Alumno Registrado - Menttio',
            body: `
              <h2>Nuevo Alumno Registrado</h2>
              <p><strong>Nombre:</strong> ${data.first_name} ${data.last_name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Teléfono:</strong> ${data.phone}</p>
              <p><strong>Rol:</strong> Alumno</p>
            `
          });
        } catch (emailError) {
          console.error('Error enviando email de notificación:', emailError);
          // No fallar el registro si falla el email
        }

        sessionStorage.removeItem('student_signup_data');
        window.location.href = createPageUrl('StudentDashboard');
      } catch (error) {
        console.error('Error completing signup:', error);
        setError(error.message);
      }
    };

    completeSignup();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button onClick={() => navigate(createPageUrl('StudentSignup'))}>
            Volver al registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-[#41f2c0] mx-auto mb-4" size={40} />
        <p className="text-gray-600">Completando tu registro...</p>
      </div>
    </div>
  );
}