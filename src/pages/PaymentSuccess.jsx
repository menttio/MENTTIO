import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate(createPageUrl('BookClass'));
      return;
    }

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Wait a moment before allowing navigation
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card className="border-2 border-[#41f2c0]">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#41f2c0] flex items-center justify-center"
            >
              <CheckCircle className="text-white" size={48} />
            </motion.div>

            <h1 className="text-2xl font-bold text-[#404040] mb-2">
              ¡Pago realizado con éxito!
            </h1>
            
            <p className="text-gray-500 mb-6">
              Tu clase ha sido reservada y el pago procesado correctamente.
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" size={20} />
                <span>Procesando reserva...</span>
              </div>
            ) : (
              <Button
                onClick={() => navigate(createPageUrl('MyClasses'))}
                className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                Ver mis clases
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}