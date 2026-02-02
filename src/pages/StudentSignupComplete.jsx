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
        const signupData = sessionStorage.getItem('student_signup_data');
        
        if (!signupData) {
          navigate(createPageUrl('StudentSignup'));
          return;
        }

        const data = JSON.parse(signupData);
        
        // Register with email/password using Base44 SDK
        await base44.auth.register({
          email: data.email,
          password: data.password,
          full_name: `${data.first_name} ${data.last_name}`
        });
        
        // Create student profile
        await base44.entities.Student.create({
          user_email: data.email,
          full_name: `${data.first_name} ${data.last_name}`,
          phone: data.phone,
          assigned_teachers: []
        });

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