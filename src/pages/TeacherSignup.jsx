import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Users, Check, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function TeacherSignup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    phone: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData(prev => ({ ...prev, full_name: currentUser.full_name || '' }));

        // Check if already a teacher
        const teachers = await base44.entities.Teacher.filter({ user_email: currentUser.email });
        if (teachers.length > 0) {
          navigate(createPageUrl('TeacherDashboard'));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // In a real implementation, this would integrate with Stripe/PayPal
      // For now, we'll create the teacher account with subscription_active = true
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);

      await base44.entities.Teacher.create({
        user_email: user.email,
        full_name: formData.full_name,
        bio: formData.bio || '',
        subjects: [],
        rating: 0,
        total_classes: 0,
        subscription_active: true,
        subscription_expires: expirationDate.toISOString().split('T')[0]
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
          onClick={() => navigate(createPageUrl('SelectRole'))}
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Volver
        </Button>

        {step === 1 && (
          <Card className="shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-4">
                <Users className="text-[#41f2c0]" size={40} />
              </div>
              <CardTitle className="text-3xl font-bold text-[#404040]">
                Únete como Profesor
              </CardTitle>
              <p className="text-gray-500 mt-2">
                Ofrece tus clases y gana dinero compartiendo tu conocimiento
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="text-[#41f2c0]" size={24} />
                  </div>
                  <h3 className="font-semibold text-[#404040] mb-1">Gestión Completa</h3>
                  <p className="text-sm text-gray-500">
                    Calendario, disponibilidad y clases en un solo lugar
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="text-[#41f2c0]" size={24} />
                  </div>
                  <h3 className="font-semibold text-[#404040] mb-1">Define tus Precios</h3>
                  <p className="text-sm text-gray-500">
                    Tú decides cuánto cobrar por tus clases
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="text-[#41f2c0]" size={24} />
                  </div>
                  <h3 className="font-semibold text-[#404040] mb-1">Alumnos Esperándote</h3>
                  <p className="text-sm text-gray-500">
                    Accede a nuestra red de estudiantes
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-6">
                <div className="bg-[#41f2c0]/10 rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Suscripción mensual</p>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-5xl font-bold text-[#404040]">29€</span>
                    <span className="text-gray-500">/mes</span>
                  </div>
                  <ul className="text-left space-y-2 max-w-sm mx-auto mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="text-[#41f2c0] mt-0.5" size={16} />
                      <span>Acceso completo a la plataforma</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="text-[#41f2c0] mt-0.5" size={16} />
                      <span>Sin límite de alumnos ni clases</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="text-[#41f2c0] mt-0.5" size={16} />
                      <span>Herramientas de gestión avanzadas</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="text-[#41f2c0] mt-0.5" size={16} />
                      <span>Soporte prioritario</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-lg py-6"
                  >
                    Continuar al Registro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-[#404040]">
                Completa tu Perfil de Profesor
              </CardTitle>
              <p className="text-gray-500 mt-2">
                Cuéntanos sobre ti y tu experiencia
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Nombre completo *
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Biografía
                  </label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Cuéntanos sobre tu experiencia, formación y metodología de enseñanza..."
                    rows={4}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <CreditCard className="text-yellow-600 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-[#404040] mb-1">Nota sobre el pago</h4>
                      <p className="text-sm text-gray-600">
                        En esta versión demo, la cuenta de profesor se activa automáticamente. 
                        En producción, aquí se integraría el proceso de pago con Stripe o PayPal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Volver
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.full_name}
                    className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : 'Crear Cuenta de Profesor'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}