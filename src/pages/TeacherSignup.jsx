import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Users, Check, CreditCard, Loader2, ArrowLeft, ArrowRight, Plus, Trash2, Minus } from 'lucide-react';
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
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    education: '',
    experience_years: 0
  });

  const [teacherSubjects, setTeacherSubjects] = useState([]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData(prev => ({ ...prev, full_name: currentUser.full_name || '' }));

        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          navigate(createPageUrl('TeacherDashboard'));
        }

        const allSubjects = await base44.entities.Subject.list();
        setSubjects(allSubjects);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const addSubject = () => {
    setTeacherSubjects([...teacherSubjects, { subject_id: '', subject_name: '', price_per_hour: 0 }]);
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
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTeacherSubjects(updated);
  };

  const canContinueStep1 = formData.full_name && formData.phone && formData.education && formData.experience_years >= 0;
  const canContinueStep2 = teacherSubjects.length > 0 && teacherSubjects.every(s => s.subject_id && s.price_per_hour > 0);
  const canFinalize = acceptedTerms;

  const handleFinalize = async () => {
    setSaving(true);
    try {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      await base44.entities.Teacher.create({
        user_email: user.email,
        full_name: formData.full_name,
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
        tour_completed: false
      });

      navigate(createPageUrl('TeacherDashboard'));
    } catch (error) {
      console.error(error);
    } finally {
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
                      Nombre y Apellidos *
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Ej: Juan García López"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Número de Teléfono *
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+34 600 000 000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Estudios *
                    </label>
                    <Input
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      placeholder="Ej: Licenciatura en Matemáticas, Universidad Complutense"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">
                      Años de Experiencia *
                    </label>
                    <div className="flex items-center gap-3 max-w-xs">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData({ 
                          ...formData, 
                          experience_years: Math.max(0, formData.experience_years - 1) 
                        })}
                        disabled={formData.experience_years <= 0}
                        className="flex-shrink-0"
                      >
                        <Minus size={18} />
                      </Button>
                      <Input
                        type="number"
                        value={formData.experience_years}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          experience_years: Math.min(99, Math.max(0, parseInt(e.target.value) || 0))
                        })}
                        className="text-center text-xl font-semibold w-20"
                        min="0"
                        max="99"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData({ 
                          ...formData, 
                          experience_years: Math.min(99, formData.experience_years + 1)
                        })}
                        className="flex-shrink-0"
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-[#41f2c0]/10 rounded-xl p-4 mt-6">
                    <h4 className="font-semibold text-[#404040] mb-2">🎉 Primer mes GRATIS</h4>
                    <p className="text-sm text-gray-600">
                      Prueba la plataforma durante 30 días sin compromiso. Después solo 29€/mes.
                    </p>
                  </div>

                  <Button
                    onClick={() => setStep(2)}
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#404040]">Asignaturas que impartes</h3>
                    <Button
                      onClick={addSubject}
                      size="sm"
                      className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                    >
                      <Plus size={16} className="mr-2" />
                      Añadir
                    </Button>
                  </div>

                  {teacherSubjects.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Añade al menos una asignatura para continuar
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3 items-center px-3 pb-2">
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-600">Asignatura</span>
                        </div>
                        <div className="w-32">
                          <span className="text-sm font-semibold text-gray-600">Precio por hora</span>
                        </div>
                        <div className="w-10" />
                      </div>
                      {teacherSubjects.map((ts, idx) => (
                        <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
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
                            <Input
                              type="number"
                              value={ts.price_per_hour}
                              onChange={(e) => updateSubject(idx, 'price_per_hour', parseFloat(e.target.value) || 0)}
                              placeholder="€/hora"
                              min="0"
                              step="0.5"
                            />
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
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-5xl font-bold text-[#404040]">0€</span>
                      <span className="text-gray-500">el primer mes</span>
                    </div>
                    <p className="text-sm text-gray-500">Después 29€/mes</p>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50">
                    <h4 className="font-semibold text-[#404040] mb-3">Términos y Condiciones</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><strong>1. Aceptación de los términos</strong></p>
                      <p>Al registrarte como profesor en Menπio, aceptas cumplir con estos términos y condiciones.</p>
                      
                      <p><strong>2. Suscripción y pago</strong></p>
                      <p>- El primer mes es gratuito como periodo de prueba</p>
                      <p>- Después se cobrará 29€/mes de forma automática</p>
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