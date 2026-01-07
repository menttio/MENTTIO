import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  CreditCard, 
  Smartphone, 
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function PaymentDialog({ booking, open, onOpenChange, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [bizumConfirmed, setBizumConfirmed] = useState(false);

  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('createCheckout', {
        teacherId: booking.teacher_id,
        teacherName: booking.teacher_name,
        teacherEmail: booking.teacher_email,
        subjectId: booking.subject_id,
        subjectName: booking.subject_name,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        duration: booking.duration_minutes,
        price: booking.price,
        bookingId: booking.id
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Error al procesar el pago. Inténtalo de nuevo.');
      setProcessing(false);
    }
  };

  const handleBizumConfirm = async () => {
    setProcessing(true);
    try {
      await base44.entities.Booking.update(booking.id, {
        payment_status: 'paid',
        payment_method: 'bizum'
      });

      await base44.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'booking_modified',
        title: 'Pago recibido',
        message: `${booking.student_name} ha confirmado el pago por Bizum de la clase de ${booking.subject_name}`,
        related_id: booking.id,
        link_page: 'TeacherCalendar'
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error al confirmar el pago. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Número copiado al portapapeles');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar pago</DialogTitle>
          <DialogDescription>
            Clase de {booking?.subject_name} - {booking?.price}€
          </DialogDescription>
        </DialogHeader>

        {!selectedMethod ? (
          <div className="space-y-3 py-4">
            <button
              onClick={() => setSelectedMethod('stripe')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#41f2c0] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CreditCard className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#404040]">Tarjeta de crédito/débito</h3>
                  <p className="text-sm text-gray-500">Pago seguro con Stripe</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('bizum')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#41f2c0] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                  <Smartphone className="text-[#41f2c0]" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#404040]">Bizum</h3>
                  <p className="text-sm text-gray-500">Pago directo al profesor</p>
                  <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 text-xs">
                    Sin comisiones
                  </Badge>
                </div>
              </div>
            </button>
          </div>
        ) : selectedMethod === 'stripe' ? (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <CreditCard className="mx-auto text-purple-600 mb-3" size={48} />
              <h3 className="font-semibold text-[#404040] mb-2">Pago con tarjeta</h3>
              <p className="text-sm text-gray-500 mb-4">
                Serás redirigido a la pasarela segura de Stripe
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-2xl font-bold text-[#404040]">{booking?.price}€</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedMethod(null)}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleStripePayment}
                disabled={processing}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {processing ? <Loader2 className="animate-spin" /> : 'Continuar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {!bizumConfirmed ? (
              <>
                <div className="text-center">
                  <Smartphone className="mx-auto text-[#41f2c0] mb-3" size={48} />
                  <h3 className="font-semibold text-[#404040] mb-2">Pago por Bizum</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Envía el pago al teléfono del profesor
                  </p>
                </div>

                <div className="bg-[#41f2c0]/10 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Profesor</p>
                    <p className="font-semibold text-[#404040]">{booking?.teacher_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Teléfono Bizum</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg text-[#404040]">
                        {booking?.teacher_phone || '---'}
                      </p>
                      {booking?.teacher_phone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(booking.teacher_phone)}
                        >
                          <Copy size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Importe</p>
                    <p className="text-2xl font-bold text-[#41f2c0]">{booking?.price}€</p>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700">
                  💡 Abre tu app de Bizum, envía el pago al número indicado y confirma aquí cuando esté hecho
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMethod(null)}
                    className="flex-1"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={() => setBizumConfirmed(true)}
                    className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    He enviado el pago
                  </Button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <CheckCircle className="mx-auto text-[#41f2c0] mb-3" size={64} />
                <h3 className="font-semibold text-[#404040] mb-2">
                  ¿Confirmas el pago?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Al confirmar, se marcará la clase como pagada
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setBizumConfirmed(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBizumConfirm}
                    disabled={processing}
                    className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                  >
                    {processing ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}