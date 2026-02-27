import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Check, Loader2, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function RenewSubscription() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const user = await base44.auth.me();
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
          setSelectedPlan(teachers[0].subscription_plan || 'premium');
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
      const response = await base44.functions.invoke('createTeacherSubscription', {
        subscription_plan: selectedPlan
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      window.location.replace(response.data.url);
    } catch (error) {
      console.error(error);
      alert('Error al procesar el pago: ' + error.message);
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
            <CardTitle className="text-2xl md:text-3xl font-bold text-[#404040]">
              {teacher?.trial_active ? 'Período de Prueba Expirado' : 'Suscripción Expirada'}
            </CardTitle>
            <p className="text-sm md:text-base text-gray-500 mt-2">
              {teacher?.trial_active 
                ? 'Tu período de prueba gratuito de 14 días ha finalizado. Selecciona un plan para continuar.'
                : 'Tu suscripción ha caducado. Renuévala para seguir ofreciendo tus clases.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#404040] text-center mb-4">
                Selecciona tu plan de renovación
              </label>
              
              <div 
                onClick={() => setSelectedPlan('basic')}
                className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                  selectedPlan === 'basic' 
                    ? 'border-[#41f2c0] bg-[#41f2c0]/10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-[#404040]">📚 Plan Básico</h4>
                    {!teacher?.trial_used && (
                      <Badge className="bg-green-500 text-white text-xs mb-1">14 días gratis</Badge>
                    )}
                    <p className="text-2xl font-bold text-[#404040] mt-1">9,99€<span className="text-sm font-normal text-gray-500">/mes</span></p>
                  </div>
                  {selectedPlan === 'basic' && (
                    <div className="w-6 h-6 rounded-full bg-[#41f2c0] flex items-center justify-center">
                      <Check className="text-white" size={16} />
                    </div>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-1 mt-3">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Gestión de clases y calendario
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Chat con alumnos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Gestión de disponibilidad
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <X size={14} />
                    Sin grabación de clases
                  </li>
                </ul>
              </div>

              <div 
                onClick={() => setSelectedPlan('premium')}
                className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                  selectedPlan === 'premium' 
                    ? 'border-[#41f2c0] bg-[#41f2c0]/10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[#404040]">⭐ Plan Premium</h4>
                      <Badge className="bg-[#41f2c0] text-white text-xs">Recomendado</Badge>
                    </div>
                    <p className="text-2xl font-bold text-[#404040] mt-1">19,99€<span className="text-sm font-normal text-gray-500">/mes</span></p>
                  </div>
                  {selectedPlan === 'premium' && (
                    <div className="w-6 h-6 rounded-full bg-[#41f2c0] flex items-center justify-center">
                      <Check className="text-white" size={16} />
                    </div>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-1 mt-3">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Gestión de clases y calendario
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Chat con alumnos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-[#41f2c0]" />
                    Gestión de disponibilidad
                  </li>
                  <li className="flex items-center gap-2 font-medium text-[#41f2c0]">
                    <Video size={14} />
                    Grabación y almacenamiento de clases
                  </li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleRenew}
              disabled={renewing}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-base md:text-lg py-5 md:py-6"
            >
              {renewing ? <Loader2 className="animate-spin" /> : `Renovar con Plan ${selectedPlan === 'basic' ? 'Básico' : 'Premium'}`}
            </Button>

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