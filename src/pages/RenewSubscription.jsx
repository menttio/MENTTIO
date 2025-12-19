import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CreditCard, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function RenewSubscription() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const user = await base44.auth.me();
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadTeacher();
  }, []);

  const handleRenew = async () => {
    setRenewing(true);
    try {
      // In production, this would trigger payment gateway
      const newExpirationDate = new Date();
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);

      await base44.entities.Teacher.update(teacher.id, {
        subscription_active: true,
        subscription_expires: newExpirationDate.toISOString().split('T')[0]
      });

      navigate(createPageUrl('TeacherDashboard'));
    } catch (error) {
      console.error(error);
    } finally {
      setRenewing(false);
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
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-orange-500" size={40} />
            </div>
            <CardTitle className="text-3xl font-bold text-[#404040]">
              Suscripción Expirada
            </CardTitle>
            <p className="text-gray-500 mt-2">
              Tu suscripción ha caducado. Renuévala para seguir ofreciendo tus clases.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#41f2c0]/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-2">Renovación mensual</p>
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-[#404040] mb-1 text-left">Nota sobre el pago</h4>
                    <p className="text-sm text-gray-600 text-left">
                      En esta versión demo, la renovación es automática. En producción, aquí se procesaría el pago.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRenew}
                disabled={renewing}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-lg py-6"
              >
                {renewing ? <Loader2 className="animate-spin" /> : 'Renovar Suscripción'}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => base44.auth.logout()}
                className="text-gray-500"
              >
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}