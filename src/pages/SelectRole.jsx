import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { GraduationCap, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function SelectRole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No authentication required - just load the role selection page
    setLoading(false);
  }, []);

  const handleRoleSelect = (role, action) => {
    // Store selected role in sessionStorage
    sessionStorage.setItem('selected_role', role);
    sessionStorage.setItem('role_action', action); // 'login' or 'register'
    
    if (action === 'register') {
      // Go directly to signup form
      if (role === 'teacher') {
        navigate(createPageUrl('TeacherSignup'));
      } else {
        navigate(createPageUrl('StudentSignup'));
      }
    } else {
      // Redirect to login page
      base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Home'))}
            className="mb-6 text-gray-500 hover:text-[#404040]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Volver
          </Button>
          <h1 className="text-4xl font-bold mb-4">
            ¡Bienvenido a <span className="text-[#404040]">Men<span className="text-[#41f2c0]">π</span>io</span>!
          </h1>
          <p className="text-gray-500 mb-12">¿Cómo quieres usar la plataforma?</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Student Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#41f2c0]"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center">
                <GraduationCap className="text-[#41f2c0]" size={40} />
              </div>
              <h2 className="text-2xl font-semibold text-[#404040] mb-2">Soy Alumno</h2>
              <p className="text-gray-500 mb-6">Quiero reservar clases particulares con profesores</p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl('Login'))}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={() => handleRoleSelect('student', 'register')}
                  variant="outline"
                  className="w-full border-[#41f2c0] text-[#41f2c0] hover:bg-[#404040] hover:text-white"
                >
                  Registrarme
                </Button>
              </div>
            </motion.div>

            {/* Teacher Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#41f2c0]"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center">
                <BookOpen className="text-[#41f2c0]" size={40} />
              </div>
              <h2 className="text-2xl font-semibold text-[#404040] mb-2">Soy Profesor</h2>
              <p className="text-gray-500 mb-2">Quiero ofrecer clases particulares a alumnos</p>
              <p className="text-xs text-[#41f2c0] mb-6 font-medium">
                Requiere suscripción mensual
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl('LoginPage'))}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={() => handleRoleSelect('teacher', 'register')}
                  variant="outline"
                  className="w-full border-[#41f2c0] text-[#41f2c0] hover:bg-[#404040] hover:text-white"
                >
                  Registrarme
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}