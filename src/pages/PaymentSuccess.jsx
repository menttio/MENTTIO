import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'confirmed' | 'timeout'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate(createPageUrl('BookClass'));
      return;
    }

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const bookingId = sessionStorage.getItem('pending_stripe_booking_id');

    if (!bookingId) {
      setTimeout(() => setStatus('confirmed'), 2000);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      try {
        const booking = await base44.entities.Booking.get(bookingId);
        if (booking?.payment_status === 'paid') {
          sessionStorage.removeItem('pending_stripe_booking_id');
          setStatus('confirmed');
          return;
        }
      } catch (_) {}

      attempts++;
      if (attempts >= maxAttempts) {
        sessionStorage.removeItem('pending_stripe_booking_id');
        setStatus('timeout');
        return;
      }

      setTimeout(poll, 2000);
    };

    setTimeout(poll, 2000);
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

            {status === 'verifying' && (
              <>
                <p className="text-gray-500 mb-6">
                  Confirmando el pago en el sistema...
                </p>
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Procesando reserva...</span>
                </div>
              </>
            )}

            {status === 'confirmed' && (
              <>
                <p className="text-gray-500 mb-6">
                  Tu clase ha sido reservada y el pago procesado correctamente.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl('MyClasses'))}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  Ver mis clases
                </Button>
              </>
            )}

            {status === 'timeout' && (
              <>
                <p className="text-gray-500 mb-4">
                  Tu clase ha sido reservada y el pago procesado correctamente.
                </p>
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg mb-6 text-left">
                  <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-yellow-700">
                    El pago fue procesado pero puede tardar unos minutos en reflejarse en tus clases.
                  </p>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl('MyClasses'))}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  Ver mis clases
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
