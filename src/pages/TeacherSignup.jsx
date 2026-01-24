import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Users, Check, CreditCard, Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Minus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TeacherSignup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [corporateAccount, setCorporateAccount] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    phone: '',
    education: '',
    experience_years: 0
  });

  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const checkUser = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (!isAuthenticated) {
          base44.auth.redirectToLogin(createPageUrl('TeacherSignup'));
          return;
        }

        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const nameParts = (currentUser.full_name || '').split(' ');
        setFormData(prev => ({ 
          ...prev, 
          nombre: nameParts[0] || '', 
          apellidos: nameParts.slice(1).join(' ') || '',
          phone: '' 
        }));

        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          navigate(createPageUrl('TeacherDashboard'));
          return;
        }

        const allSubjects = await base44.entities.Subject.list();
        setSubjects(allSubjects);
      } catch (error) {
        console.error('Error loading teacher signup:', error);
        base44.auth.redirectToLogin(createPageUrl('TeacherSignup'));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const addSubject = () => {
    setTeacherSubjects([...teacherSubjects, { subject_id: '', subject_name: '', level: '', price_per_hour: 0 }]);
  };

  const removeSubject = (index) => {
    setTeacherSubjects(teacherSubjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index, field, value) => {
    const updated = [...teacherSubjects];
    if (field === 'subject_id') {
      const subject = subjects.find(s => s.id === value);
      updated[index] = { 
        ...updated[index], 
        subject_id: value, 
        subject_name: subject?.name || '' 
      };
    } else if (field === 'price_per_hour') {
      const price = parseFloat(value) || 0;
      updated[index] = { ...updated[index], [field]: Math.max(0, Math.min(999, price)) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTeacherSubjects(updated);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateName = (name) => {
    return name.trim().length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(name);
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (!validateName(formData.nombre)) {
      newErrors.nombre = 'Introduce un nombre válido (mínimo 3 caracteres, solo letras)';
    }
    
    if (!formData.apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son obligatorios';
    } else if (!validateName(formData.apellidos)) {
      newErrors.apellidos = 'Introduce apellidos válidos (mínimo 3 caracteres, solo letras)';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Introduce un teléfono español válido (ej: +34 600 000 000)';
    }
    
    if (!formData.education.trim()) {
      newErrors.education = 'Los estudios son obligatorios';
    } else if (formData.education.trim().length < 5) {
      newErrors.education = 'Describe tus estudios (mínimo 5 caracteres)';
    }
    
    if (formData.experience_years < 0) {
      newErrors.experience_years = 'Los años de experiencia no pueden ser negativos';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canContinueStep1 = formData.nombre && formData.apellidos && formData.phone && formData.education && formData.experience_years >= 0;
  const canContinueStep2 = teacherSubjects.length > 0 && teacherSubjects.every(s => s.subject_id && s.level && s.price_per_hour > 0);
  const canFinalize = acceptedTerms;

  const handleFinalize = async () => {
    setSaving(true);
    try {
      // Crear usuario corporativo en n8n
      const response = await base44.functions.invoke('createCorporateUser', {
        nombre: formData.nombre,
        apellidos: formData.apellidos
      });

      console.log('Respuesta completa:', response);

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Error al crear usuario corporativo');
      }

      const corporateData = response.data;

      if (corporateData.status !== 'ok') {
        throw new Error('Error al crear usuario corporativo');
      }

      // Guardar datos corporativos para mostrar
      setCorporateAccount(corporateData);

      // Crear registro de profesor
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      await base44.entities.Teacher.create({
        user_email: user.email,
        full_name: `${formData.nombre} ${formData.apellidos}`,
        phone: formData.phone,
        education: formData.education,
        experience_years: formData.experience_years,
        bio: '',
        subjects: teacherSubjects,
        rating: 0,
        total_classes: 0,
        subscription_active: true,
        subscription_expires: expirationDate.toISOString().split('T')[0],
        trial_used: true,
        tour_completed: false,
        corporate_email: corporateData.email
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Error completo:', error);
      alert(`Error al crear la cuenta: ${error.message || 'Por favor, inténtalo de nuevo.'}`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  if (showSuccess && corporateAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={40} />
              </div>
              
              <h2 className="text-3xl font-bold text-[#404040] mb-2">
                ¡Cuenta Creada con Éxito!
              </h2>
              
              <p className="text-gray-600 mb-8">
                Tu cuenta corporativa ha sido creada correctamente
              </p>

              <div className="bg-[#41f2c0]/10 rounded-xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-[#404040] mb-4">Datos de Acceso Corporativo:</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Correo Corporativo:</label>
                    <p className="text-lg font-mono font-semibold text-[#404040] break-all">
                      {corporateAccount.email}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500">Contraseña Temporal:</label>
                    <p className="text-lg font-mono font-semibold text-[#404040]">
                      {corporateAccount.password}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Importante:</strong> Guarda estos datos en un lugar seguro. 
                  Por favor, cambia la contraseña en tu primer inicio de sesión.
                </p>
              </div>

              <Button
                onClick={() => window.location.href = createPageUrl('TeacherDashboard')}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg"
              >
                Ir al Panel de Profesor
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="animate-spin text-[#41f2c0]" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-[#404040] mb-2">
            Creando tu perfil...
          </h2>
          <p className="text-gray-600">
            Estamos configurando tu cuenta corporativa, esto tomará unos segundos
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate(createPageUrl('SelectRole')) : setStep(step - 1)}
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Volver
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-4">
              <Users className="text-[#41f2c0]" size={40} />
            </div>
            <CardTitle className="text-3xl font-bold text-[#404040]">
              Únete como Profesor
            </CardTitle>
            <p className="text-gray-500 mt-2">
              {step === 1 && 'Completa tu perfil profesional'}
              {step === 2 && 'Configura tus asignaturas y precios'}
              {step === 3 && 'Términos y condiciones'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-16 rounded-full transition-all ${
                    s === step ? 'bg-[#41f2c0]' : s < step ? 'bg-[#41f2c0]/50' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Nombre *
                    </label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value });
                        if (errors.nombre) setErrors({ ...errors, nombre: undefined });
                      }}
                      placeholder="Ej: Juan"
                      className={errors.nombre ? 'border-red-500' : ''}
                    />
                    {errors.nombre && (
                      <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Apellidos *
                    </label>
                    <Input
                      value={formData.apellidos}
                      onChange={(e) => {
                        setFormData({ ...formData, apellidos: e.target.value });
                        if (errors.apellidos) setErrors({ ...errors, apellidos: undefined });
                      }}
                      placeholder="Ej: García López"
                      className={errors.apellidos ? 'border-red-500' : ''}
                    />
                    {errors.apellidos && (
                      <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Número de Teléfono *
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                      }}
                      placeholder="+34 600 000 000"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">Formato: +34 seguido de 9 dígitos</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Estudios *
                    </label>
                    <Input
                      value={formData.education}
                      onChange={(e) => {
                        setFormData({ ...formData, education: e.target.value });
                        if (errors.education) setErrors({ ...errors, education: undefined });
                      }}
                      placeholder="Ej: Licenciatura en Matemáticas, Universidad Complutense"
                      className={errors.education ? 'border-red-500' : ''}
                    />
                    {errors.education && (
                      <p className="text-red-500 text-xs mt-1">{errors.education}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Años de Experiencia *
                    </label>
                    <Input
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        experience_years: Math.min(99, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="text-center text-xl font-semibold w-24"
                      min="0"
                      max="99"
                    />
                  </div>

                  <div className="bg-[#41f2c0]/10 rounded-xl p-4 mt-6">
                    <h4 className="font-semibold text-[#404040] mb-2">💼 Suscripción Mensual</h4>
                    <p className="text-sm text-gray-600">
                      Acceso completo a la plataforma por 19,99€/mes.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      if (validateStep1()) {
                        setStep(2);
                      }
                    }}
                    disabled={!canContinueStep1}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6"
                  >
                    Continuar
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Subjects */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#404040]">Asignaturas que impartes</h3>
                        <div className="relative group">
                          <Info size={16} className="text-gray-400 cursor-help" />
                          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                            <div className="bg-[#404040] text-white text-xs rounded-lg p-3 w-72 shadow-lg">
                              <p className="font-semibold mb-1">⚠️ Importante sobre los niveles</p>
                              <p className="mb-2">Debes crear una asignatura separada por cada nivel que enseñes.</p>
                              <p className="text-gray-300">Ejemplo: Si enseñas Matemáticas en ESO, Bachillerato y Universidad, crea 3 asignaturas diferentes con sus respectivos niveles y precios.</p>
                              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-[-1px]">
                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#404040]"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={addSubject}
                        size="sm"
                        className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                      >
                        <Plus size={16} className="mr-2" />
                        Añadir
                      </Button>
                    </div>
                  </div>

                  {teacherSubjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Añade al menos una asignatura para continuar
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teacherSubjects.map((ts, idx) => (
                        <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl">
                          <div className="flex-1">
                            <Select
                              value={ts.subject_id}
                              onValueChange={(value) => updateSubject(idx, 'subject_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona asignatura" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32">
                            <Select
                              value={ts.level}
                              onValueChange={(value) => updateSubject(idx, 'level', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Nivel" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ESO">ESO</SelectItem>
                                <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                                <SelectItem value="Universidad">Universidad</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={ts.price_per_hour}
                              onChange={(e) => updateSubject(idx, 'price_per_hour', e.target.value)}
                              placeholder="20"
                              min="0"
                              max="999"
                              step="0.5"
                              className="w-24 text-right"
                            />
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">€/h</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSubject(idx)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 mt-6"
                  >
                    Continuar
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Terms & Payment */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-[#41f2c0]/10 rounded-2xl p-6 text-center mb-6">
                    <p className="text-sm text-gray-500 mb-2">Suscripción mensual</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-[#404040]">19,99€</span>
                      <span className="text-gray-500">/mes</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <h4 className="font-semibold text-[#404040] mb-3">Términos y Condiciones</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><strong>1. Aceptación de los términos</strong></p>
                      <p>Al registrarte como profesor en Menπio, aceptas cumplir con estos términos y condiciones.</p>
                      
                      <p><strong>2. Suscripción y pago</strong></p>
                      <p>- La suscripción tiene un coste de 19,99€/mes</p>
                      <p>- Se cobrará de forma automática cada mes</p>
                      <p>- Puedes cancelar tu suscripción en cualquier momento</p>
                      <p>- No hay reembolsos por periodos parciales</p>
                      
                      <p><strong>3. Responsabilidades del profesor</strong></p>
                      <p>- Mantener actualizada tu disponibilidad</p>
                      <p>- Asistir puntualmente a las clases reservadas</p>
                      <p>- Proporcionar un servicio educativo de calidad</p>
                      <p>- Mantener una comunicación profesional con los alumnos</p>
                      
                      <p><strong>4. Política de cancelación</strong></p>
                      <p>- Las clases pueden modificarse con al menos 24 horas de antelación</p>
                      <p>- Cancelaciones repetidas pueden resultar en la suspensión de la cuenta</p>
                      
                      <p><strong>5. Privacidad y datos</strong></p>
                      <p>- Tus datos personales se tratarán según nuestra política de privacidad</p>
                      <p>- No compartiremos tu información con terceros sin tu consentimiento</p>
                      <p>- Los alumnos podrán ver tu perfil público, asignaturas y disponibilidad</p>
                      
                      <p><strong>6. Pagos y comisiones</strong></p>
                      <p>- Los pagos de los alumnos se procesan directamente entre profesor y alumno</p>
                      <p>- Menπio no gestiona los pagos de las clases, solo la suscripción mensual</p>
                      
                      <p><strong>7. Suspensión y terminación</strong></p>
                      <p>- Nos reservamos el derecho de suspender cuentas que incumplan estos términos</p>
                      <p>- Puedes eliminar tu cuenta en cualquier momento desde configuración</p>
                      
                      <p><strong>8. Modificaciones</strong></p>
                      <p>- Estos términos pueden actualizarse periódicamente</p>
                      <p>- Se te notificará de cambios significativos</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={setAcceptedTerms}
                      className="mt-0.5 data-[state=checked]:bg-[#41f2c0] data-[state=checked]:border-[#41f2c0]"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                      He leído y acepto los términos y condiciones, así como la política de privacidad de Menπio
                    </label>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="text-yellow-600 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-semibold text-[#404040] mb-1">Nota sobre el pago</h4>
                        <p className="text-sm text-gray-600">
                          En esta versión demo, el registro se activa automáticamente. En producción, aquí se procesaría el pago con Stripe o PayPal.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleFinalize}
                    disabled={!canFinalize || saving}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : 'Activar Cuenta de Profesor'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}