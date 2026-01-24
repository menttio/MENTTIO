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
      // Redirect to Google Auth
      base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
    }
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
    
    // Validar que los campos requeridos estén llenos
    if (!formData.first_name || !formData.last_name) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }
    
    if (selectedRole === 'student' && !formData.phone) {
      alert('El teléfono es obligatorio para los alumnos');
      return;
    }
    
    if (selectedRole === 'student' && formData.phone && !validatePhone(formData.phone)) {
      return;
    }
    
    setSaving(true);
    try {
      console.log('Creating profile for:', user.email);
      
      if (selectedRole === 'teacher') {
        const teacherData = {
          user_email: user.email,
          full_name: `${formData.first_name} ${formData.last_name}`,
          bio: formData.bio || '',
          phone: formData.phone || '',
          subjects: [],
          rating: 0,
          total_classes: 0
        };
        console.log('Creating teacher:', teacherData);
        await base44.entities.Teacher.create(teacherData);
        window.location.href = createPageUrl('TeacherDashboard');
      } else {
        const studentData = {
          user_email: user.email,
          full_name: `${formData.first_name} ${formData.last_name}`,
          phone: formData.phone,
          assigned_teachers: []
        };
        console.log('Creating student:', studentData);
        await base44.entities.Student.create(studentData);
        console.log('Student created successfully');
        window.location.href = createPageUrl('StudentDashboard');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      console.error('Error details:', error.message, error.stack);
      alert(`Error al crear el perfil: ${error.message || 'Por favor, inténtalo de nuevo.'}`);
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
                    onClick={() => handleRoleSelect('student', 'login')}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    Iniciar Sesión
                  </Button>
                  <Button
                    onClick={() => handleRoleSelect('student', 'register')}
                    variant="outline"
                    className="w-full border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white"
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
                    onClick={() => handleRoleSelect('teacher', 'login')}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    Iniciar Sesión
                  </Button>
                  <Button
                    onClick={() => handleRoleSelect('teacher', 'register')}
                    variant="outline"
                    className="w-full border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white"
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

            return null; // Remove the old student details form
            }

            if (false) { // This block is now unreachable but keeping structure
            return (
            <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
            >
            <div className="text-center">{/* old content */}</div>
            {step === 'role' ? (<div></div>) : (
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