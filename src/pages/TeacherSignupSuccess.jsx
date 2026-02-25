import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeacherSignupSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-600" size={40} />
            </div>
            
            <h2 className="text-3xl font-bold text-[#404040] mb-2">
              ¡Cuenta Creada con Éxito!
            </h2>
            
            <p className="text-gray-600 mb-4">
              Tu perfil de profesor ha sido creado y tu método de pago ha sido registrado correctamente.
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="text-white" size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-[#404040] mb-2">✨ Tu período de prueba ha comenzado</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• Tienes <strong>14 días de prueba gratuita</strong></p>
                    <p>• No se realizará ningún cargo hasta que finalice el período de prueba</p>
                    <p>• Puedes cancelar en cualquier momento sin costo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 text-left">
                <strong>📌 Próximos pasos:</strong>
              </p>
              <ul className="text-sm text-gray-700 space-y-1 mt-2 text-left list-disc list-inside">
                <li>Configura tu disponibilidad horaria</li>
                <li>Conecta tu Google Calendar</li>
                <li>Completa tu perfil público</li>
                <li>¡Empieza a recibir solicitudes de clases!</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate(createPageUrl('TeacherDashboard'))}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg"
            >
              Ir a mi Panel de Profesor
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}