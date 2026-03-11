import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Copy, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function CorporateCredentials() {
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('corporate_credentials');
    if (stored) {
      setCredentials(JSON.parse(stored));
      sessionStorage.removeItem('corporate_credentials');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, []);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContinue = () => {
    window.location.href = createPageUrl('TeacherDashboard') + '?setup=success';
  };

  if (!credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-orange-500" size={32} />
              </div>
              <h2 className="text-xl font-bold text-[#404040] mb-2">No se encontraron credenciales</h2>
              <p className="text-gray-500 text-sm mb-6">
                Las credenciales de tu cuenta corporativa te serán enviadas por email.
              </p>
              <Button
                onClick={handleContinue}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12"
              >
                Ir al dashboard
                <ArrowRight size={18} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 rounded-full bg-[#41f2c0]/20 flex items-center justify-center"
              >
                <Mail className="text-[#41f2c0]" size={32} />
              </motion.div>
            </div>

            <h2 className="text-2xl font-bold text-center text-[#404040] mb-2">
              ¡Pago completado!
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">
              Tu cuenta corporativa <strong>@menttio.com</strong> está lista. Guarda estas credenciales en un lugar seguro.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Email corporativo</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[#404040] font-semibold break-all">{credentials.email}</p>
                  <button
                    onClick={() => handleCopy(credentials.email, 'email')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copied === 'email'
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <Copy size={16} className="text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Contraseña</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[#404040] font-semibold">{credentials.password}</p>
                  <button
                    onClick={() => handleCopy(credentials.password, 'password')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copied === 'password'
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <Copy size={16} className="text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold h-12"
            >
              Ir a mi dashboard
              <ArrowRight size={18} />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}