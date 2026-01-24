import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { GraduationCap, BookOpen, ArrowRight, Loader2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

export default function SelectRole() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const nameParts = (currentUser.full_name || '').split(' ');
        setFormData(prev => ({ 
          ...prev, 
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || ''
        }));

        // Check URL params for role
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');

        // Check if already has a role
        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          navigate(createPageUrl('TeacherDashboard'));
          return;
        }

        const students = await base44.entities.Student.filter({ user_email: currentUser.email });
        if (students.length > 0) {
          navigate(createPageUrl('StudentDashboard'));
          return;
        }

        // If role param is provided, go directly to details
        if (roleParam === 'student') {
          setSelectedRole('student');
          setStep('details');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleRoleSelect = (role) => {
    if (role === 'teacher') {
      navigate(createPageUrl('TeacherSignup'));
      return;
    }
    setSelectedRole(role);
    setStep('details');
  };

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
    
    if (selectedRole === 'student' && formData.phone && !validatePhone(formData.phone)) {
      return;
    }
    
    setSaving(true);
    try {
      if (selectedRole === 'teacher') {
        await base44.entities.Teacher.create({
          user_email: user.email,
          full_name: `${formData.first_name} ${formData.last_name}`,
          bio: formData.bio,
          phone: formData.phone || '',
          subjects: [],
          rating: 0,
          total_classes: 0
        });
        window.location.href = createPageUrl('TeacherDashboard');
      } else {
        await base44.entities.Student.create({
          user_email: user.email,
          full_name: `${formData.first_name} ${formData.last_name}`,
          phone: formData.phone || '',
          assigned_teachers: []
        });
        window.location.href = createPageUrl('StudentDashboard');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Error al crear el perfil. Por favor, inténtalo de nuevo.');
      setSaving(false);
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
        {step === 'role' ? (
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect('student')}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#41f2c0] group"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center group-hover:bg-[#41f2c0] transition-colors">
                  <GraduationCap className="text-[#41f2c0] group-hover:text-white transition-colors" size={40} />
                </div>
                <h2 className="text-2xl font-semibold text-[#404040] mb-2">Soy Alumno</h2>
                <p className="text-gray-500">Quiero reservar clases particulares con profesores</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect('teacher')}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#41f2c0] group"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center group-hover:bg-[#41f2c0] transition-colors">
                  <BookOpen className="text-[#41f2c0] group-hover:text-white transition-colors" size={40} />
                </div>
                <h2 className="text-2xl font-semibold text-[#404040] mb-2">Soy Profesor</h2>
                <p className="text-gray-500">Quiero ofrecer clases particulares a alumnos</p>
                <p className="text-xs text-[#41f2c0] mt-2 font-medium">
                  Requiere suscripción mensual
                </p>
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-2xl shadow-lg"
          >
            <button
              onClick={() => setStep('role')}
              className="text-gray-500 hover:text-[#404040] mb-6 flex items-center gap-2"
            >
              ← Volver
            </button>

            <h2 className="text-2xl font-bold text-[#404040] mb-2">
              Completa tu perfil de {selectedRole === 'teacher' ? 'Profesor' : 'Alumno'}
            </h2>
            <p className="text-gray-500 mb-8">Esta información será visible para otros usuarios</p>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
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

              {selectedRole === 'student' && (
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
              )}

              {selectedRole === 'teacher' && (
                <div>
                  <Label htmlFor="bio">Sobre ti</Label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Cuéntanos sobre tu experiencia, metodología..."
                    className="mt-2 w-full p-3 border rounded-lg resize-none h-32 focus:ring-2 focus:ring-[#41f2c0] focus:border-transparent outline-none"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.first_name || 
                  !formData.last_name || 
                  (selectedRole === 'student' && (!formData.phone || phoneError)) ||
                  saving
                }
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg rounded-xl"
              >
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Comenzar <ArrowRight className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}