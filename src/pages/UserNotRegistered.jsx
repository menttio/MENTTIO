import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { AlertCircle, ArrowRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function UserNotRegistered() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  const handleGoToRegister = () => {
    // Check URL parameters to determine role
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    
    console.log('Role detected:', role); // Debug
    
    if (role === 'teacher') {
      window.location.href = createPageUrl('TeacherSignup');
    } else if (role === 'student') {
      window.location.href = createPageUrl('StudentSignup');
    } else {
      window.location.href = createPageUrl('SelectRole');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#41f2c0]" />
          <p className="text-[#404040]">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle className="text-amber-500" size={32} />
        </div>

        <h2 className="text-2xl font-bold text-[#404040] mb-2 text-center">
          Cuenta no registrada
        </h2>
        <p className="text-gray-500 mb-2 text-center">
          La cuenta <strong>{user?.email}</strong> no está registrada en Menttio.
        </p>
        <p className="text-gray-500 mb-8 text-center">
          Por favor, regístrate para poder acceder a la plataforma.
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleGoToRegister}
            className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 text-base rounded-xl"
          >
            Ir a registrarme <ArrowRight className="ml-2" />
          </Button>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 py-5 text-base rounded-xl"
          >
            <LogOut className="mr-2" size={18} />
            Cerrar sesión y volver
          </Button>
        </div>
      </motion.div>
    </div>
  );
}