import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Users, Check, Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Info, X } from 'lucide-react';
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

// ⚠️ Token secreto — solo quienes tengan el link correcto acceden
const BETA_TOKEN = 'beta2024menttio';

export default function BetaTeacherSignup() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    phone: '',
    email_personal: '',
    education: '',
    experience_years: 0,
  });

  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Verificar token en la URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token !== BETA_TOKEN) {
      // Token inválido → redirigir a Home
      window.location.href = createPageUrl('Home');
      return;
    }
    setAuthorized(true);

    base44.entities.Subject.list().then(s => {
      setSubjects(s);
      setLoading(false);
    }).catch(() => setLoading(false));
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
      updated[index] = { ...updated[index], subject_id: value, subject_name: subject?.name || '' };
    } else if (field === 'price_per_hour') {
      updated[index] = { ...updated[index], [field]: Math.max(0, Math.min(999, parseFloat(value) || 0)) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTeacherSubjects(updated);
  };

  const validatePhone = (phone) => /^(\+34|0034|34)?[6789]\d{8}$/.test(phone.replace(/\s/g, ''));
  const validateName = (name) => name.trim().length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.nombre.trim() || !validateName(formData.nombre))
      newErrors.nombre = 'Introduce un nombre válido (mínimo 3 caracteres, solo letras)';
    if (!formData.apellidos.trim() || !validateName(formData.apellidos))
      newErrors.apellidos = 'Introduce apellidos válidos (mínimo 3 caracteres, solo letras)';
    if (!formData.email_personal.trim() || !validateEmail(formData.email_personal))
      newErrors.email_personal = 'Introduce un email válido';
    if (!formData.phone.trim() || !validatePhone(formData.phone))
      newErrors.phone = 'Introduce un teléfono español válido (ej: +34 600 000 000)';
    if (!formData.education.trim() || formData.education.trim().length < 5)
      newErrors.education = 'Describe tus estudios (mínimo 5 caracteres)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canContinueStep1 = formData.nombre && formData.apellidos && formData.email_personal && formData.phone && formData.education;
  const canContinueStep2 = teacherSubjects.length > 0 && teacherSubjects.every(s => s.subject_id && s.level && s.price_per_hour > 0);

  const handleFinalize = () => {
    const signupData = {
      first_name: formData.nombre,
      last_name: formData.apellidos,
      email_personal: formData.email_personal,
      phone: formData.phone,
      education: formData.education,
      experience_years: formData.experience_years,
      subjects: teacherSubjects,
      is_beta: true,
    };
    sessionStorage.setItem('teacher_signup_data', JSON.stringify(signupData));
    sessionStorage.setItem('subscription_plan', 'basic');
    setShowSuccess(true);
  };

  const handleGoToLogin = () => {
    const signupData = sessionStorage.getItem('teacher_signup_data');
    if (!signupData) {
      toast.error('Error: los datos no se guardaron. Por favor vuelve a intentarlo.');
      return;
    }
    sessionStorage.setItem('teacher_signup_in_progress', 'true');
    const nextUrl = createPageUrl('BetaTeacherSignupPayment');
    base44.auth.redirectToLogin(nextUrl);
  };

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-[#404040] mb-2">¡Datos Guardados!</h2>
              <p className="text-gray-600 mb-8">
                Ya puedes iniciar sesión con tu cuenta de Google para completar el registro
              </p>
              <Button
                onClick={handleGoToLogin}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg"
              >
                Ir a Iniciar Sesión
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <button
        onClick={() => step === 1 ? navigate(createPageUrl('Home')) : setStep(step - 1)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft size={20} className="text-[#404040]" />
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
        <button
          onClick={() => step === 1 ? navigate(createPageUrl('Home')) : setStep(step - 1)}
          className="mb-4 p-2 rounded-lg hover:bg-white hover:shadow-md transition-all text-[#404040] hidden lg:inline-flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Beta banner */}
        <div className="mb-4 bg-[#41f2c0]/20 border border-[#41f2c0] rounded-xl px-5 py-3 text-center">
          <p className="text-[#404040] font-semibold text-sm">
            🧪 Acceso Beta — 30 días de prueba gratuita, después 14,99€/mes. Cancela cuando quieras.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-4">
              <Users className="text-[#41f2c0]" size={40} />
            </div>
            <CardTitle className="text-3xl font-bold text-[#404040]">Únete como Profesor Beta</CardTitle>
            <p className="text-gray-500 mt-2">
              {step === 1 && 'Completa tu perfil profesional'}
              {step === 2 && 'Configura tus asignaturas y precios'}
              {step === 3 && 'Términos y condiciones'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-2 w-16 rounded-full transition-all ${s === step ? 'bg-[#41f2c0]' : s < step ? 'bg-[#41f2c0]/50' : 'bg-gray-200'}`} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Nombre *</label>
                    <Input value={formData.nombre} onChange={(e) => { setFormData({ ...formData, nombre: e.target.value }); if (errors.nombre) setErrors({ ...errors, nombre: undefined }); }} placeholder="Ej: Juan" className={errors.nombre ? 'border-red-500' : ''} />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Apellidos *</label>
                    <Input value={formData.apellidos} onChange={(e) => { setFormData({ ...formData, apellidos: e.target.value }); if (errors.apellidos) setErrors({ ...errors, apellidos: undefined }); }} placeholder="Ej: García López" className={errors.apellidos ? 'border-red-500' : ''} />
                    {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Email Personal *</label>
                    <Input type="email" value={formData.email_personal} onChange={(e) => { setFormData({ ...formData, email_personal: e.target.value }); if (errors.email_personal) setErrors({ ...errors, email_personal: undefined }); }} placeholder="tu.email@gmail.com" className={errors.email_personal ? 'border-red-500' : ''} />
                    {errors.email_personal && <p className="text-red-500 text-xs mt-1">{errors.email_personal}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Número de Teléfono *</label>
                    <Input value={formData.phone} onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: undefined }); }} placeholder="+34 600 000 000" className={errors.phone ? 'border-red-500' : ''} />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Estudios *</label>
                    <Input value={formData.education} onChange={(e) => { setFormData({ ...formData, education: e.target.value }); if (errors.education) setErrors({ ...errors, education: undefined }); }} placeholder="Ej: Licenciatura en Matemáticas, Universidad Complutense" className={errors.education ? 'border-red-500' : ''} />
                    {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Años de Experiencia *</label>
                    <Input type="number" value={formData.experience_years} onChange={(e) => setFormData({ ...formData, experience_years: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })} className="text-center text-xl font-semibold w-24" min="0" max="99" />
                  </div>

                  {/* Plan fijo: Basic */}
                  <div className="bg-[#41f2c0]/10 border-2 border-[#41f2c0] rounded-xl p-4 mt-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-[#404040]">📚 Plan Básico</h4>
                        <p className="text-2xl font-bold text-[#404040] mt-1">14,99€<span className="text-sm font-normal text-gray-500">/mes</span></p>
                        <p className="text-sm text-[#41f2c0] font-semibold mt-1">✨ 30 días gratis de prueba</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#41f2c0] flex items-center justify-center">
                        <Check className="text-white" size={16} />
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#41f2c0]" />Gestión de clases y calendario</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#41f2c0]" />Chat con alumnos</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#41f2c0]" />Gestión de disponibilidad</li>
                      <li className="flex items-center gap-2 text-gray-400"><X size={14} />Sin grabación de clases</li>
                    </ul>
                  </div>

                  <Button onClick={() => { if (validateStep1()) setStep(2); }} disabled={!canContinueStep1} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6">
                    Continuar <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Subjects */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#404040]">Asignaturas que impartes</h3>
                      <div className="relative group">
                        <Info size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                          <div className="bg-[#404040] text-white text-xs rounded-lg p-3 w-72 shadow-lg">
                            <p className="font-semibold mb-1">⚠️ Importante sobre los niveles</p>
                            <p>Crea una asignatura separada por cada nivel que enseñes.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={addSubject} size="sm" className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white">
                      <Plus size={16} className="mr-2" /> Añadir
                    </Button>
                  </div>

                  {teacherSubjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Añade al menos una asignatura para continuar</div>
                  ) : (
                    <div className="space-y-3">
                      {teacherSubjects.map((ts, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center p-3 bg-gray-50 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <Select value={ts.subject_id} onValueChange={(v) => updateSubject(idx, 'subject_id', v)}>
                              <SelectTrigger><SelectValue placeholder="Selecciona asignatura" /></SelectTrigger>
                              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="w-full md:w-32">
                            <Select value={ts.level} onValueChange={(v) => updateSubject(idx, 'level', v)}>
                              <SelectTrigger><SelectValue placeholder="Nivel" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ESO">ESO</SelectItem>
                                <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                                <SelectItem value="Universidad">Universidad</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input type="number" value={ts.price_per_hour} onChange={(e) => updateSubject(idx, 'price_per_hour', e.target.value)} placeholder="20" min="0" max="999" step="0.5" className="w-20 md:w-24 text-right" />
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">€/h</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeSubject(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={() => setStep(3)} disabled={!canContinueStep2} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 mt-6">
                    Continuar <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Terms */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-[#41f2c0]/10 rounded-2xl p-6 text-center mb-2">
                    <p className="text-sm text-gray-500 mb-1">Suscripción mensual — Plan Básico</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-[#404040]">14,99€</span>
                      <span className="text-gray-500">/mes</span>
                    </div>
                  </div>

                  {/* Trial info */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="text-white" size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#404040] mb-2">✨ Prueba gratuita de 30 días</h4>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span><strong>Los primeros 30 días son completamente gratis</strong>, sin ningún cargo.</span></p>
                          <p className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span><strong>Después de 30 días:</strong> cobro automático de 14,99€/mes.</span></p>
                          <p className="flex items-start gap-2"><span className="text-green-600 mt-0.5">•</span><span><strong>Cancela cuando quieras</strong> antes o después del período de prueba.</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <h4 className="font-semibold text-[#404040] mb-3">Términos y Condiciones</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><strong>1. Aceptación de los términos</strong></p>
                      <p>Al registrarte como profesor en Menπio, aceptas cumplir con estos términos y condiciones.</p>
                      <p><strong>2. Suscripción y pago</strong></p>
                      <p>- La suscripción tiene un coste de 14,99€/mes (Plan Básico)</p>
                      <p>- Se cobrará de forma automática cada mes tras los 30 días de prueba gratuita</p>
                      <p>- Puedes cancelar tu suscripción en cualquier momento</p>
                      <p>- No hay reembolsos por periodos parciales</p>
                      <p><strong>3. Responsabilidades del profesor</strong></p>
                      <p>- Mantener actualizada tu disponibilidad</p>
                      <p>- Asistir puntualmente a las clases reservadas</p>
                      <p>- Proporcionar un servicio educativo de calidad</p>
                      <p><strong>4. Privacidad y datos</strong></p>
                      <p>- Tus datos personales se tratarán según nuestra política de privacidad</p>
                      <p>- No compartiremos tu información con terceros sin tu consentimiento</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={setAcceptedTerms} className="mt-0.5 data-[state=checked]:bg-[#41f2c0] data-[state=checked]:border-[#41f2c0]" />
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                      He leído y acepto los términos y condiciones, así como la política de privacidad de Menπio
                    </label>
                  </div>

                  <Button onClick={handleFinalize} disabled={!acceptedTerms} className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg">
                    Configurar Método de Pago
                    <ArrowRight size={18} className="ml-2" />
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