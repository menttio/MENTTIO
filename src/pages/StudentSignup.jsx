import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { GraduationCap, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

export default function StudentSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length === 0) {
      setPhoneError('');
      return true;
    }
    if (!/^\d{9}$/.test(cleanPhone)) {
      setPhoneError('El teléfono debe tener 9 dígitos');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value) => {
    setFormData({ ...formData, phone: value });
    if (value) {
      validatePhone(value);
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!formData.first_name || !formData.last_name) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }
    
    if (!formData.phone) {
      toast.error('El teléfono es obligatorio para los alumnos');
      return;
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      return;
    }
    
    setLoading(true);
    try {
      // Store signup data
      sessionStorage.setItem('student_signup_data', JSON.stringify(formData));
      setLoading(false);
      setSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message || 'Por favor, inténtalo de nuevo.'}`);
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('StudentSignupComplete'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f2f2f2] to-white">
      {/* Mobile Back Button - Fixed Position */}
      <button
        onClick={() => navigate(createPageUrl('SelectRole'))}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
      >
        <ArrowLeft size={20} className="text-[#404040]" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg"
      >
        {success ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-[#404040] mb-2 text-center">
              ¡Cuenta creada!
            </h2>
            <p className="text-gray-500 mb-8 text-center">
              Ya puedes iniciar sesión con tu cuenta de Google
            </p>

            <Button
              onClick={handleGoToLogin}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg rounded-xl"
            >
              Ir a iniciar sesión <ArrowRight className="ml-2" />
            </Button>
          </>
        ) : (
          <>
            {/* Desktop Back Button */}
            <button
              onClick={() => navigate(createPageUrl('SelectRole'))}
              className="mb-6 p-2 rounded-lg hover:bg-white hover:shadow-md transition-all text-[#404040] inline-flex items-center justify-center hidden lg:inline-flex"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center">
              <GraduationCap className="text-[#41f2c0]" size={32} />
            </div>

            <h2 className="text-2xl font-bold text-[#404040] mb-2 text-center">
              Registro de Alumno
            </h2>
            <p className="text-gray-500 mb-8 text-center">
              Completa tus datos para comenzar
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Tu nombre"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">
                    Apellidos <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Tus apellidos"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">
                  Teléfono de contacto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="600000000"
                  className={`mt-2 ${phoneError ? 'border-red-500' : ''}`}
                />
                {phoneError && (
                  <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!formData.first_name || !formData.last_name || !formData.phone || phoneError || loading}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg rounded-xl"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight className="ml-2" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}