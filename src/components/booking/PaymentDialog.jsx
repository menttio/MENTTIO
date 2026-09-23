import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Smartphone, Loader2, CheckCircle, Copy, Info } from 'lucide-react';
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

const eur = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')}€`;

/**
 * Las formas de pago y el reparto del dinero los calcula el servidor (`paymentOptions`),
 * no este componente: si los calculara el navegador, cualquiera podría cambiar la comisión
 * o el número de Bizum antes de que se pintaran en pantalla.
 *
 * Antes, la opción de tarjeta dependía de `booking.teacher_stripe_enabled`, un campo que
 * no rellenaba nadie: llevaba siempre en gris y por eso nunca se pagó una clase con tarjeta.
 */
export default function PaymentDialog({ booking, open, onOpenChange, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [bizumConfirmed, setBizumConfirmed] = useState(false);
  const [opciones, setOpciones] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open || !booking?.id) return;
    setSelectedMethod(null);
    setBizumConfirmed(false);
    setCargando(true);
    base44.functions
      .invoke('paymentOptions', { bookingId: booking.id })
      .then((r) => setOpciones(r.data))
      .catch(() => setOpciones(null))
      .finally(() => setCargando(false));
  }, [open, booking?.id]);

  const d = opciones?.desglose;
  const cobraMenttio = Boolean(opciones?.bizum?.cobra_menttio);
  const tarjetaDisponible = Boolean(opciones?.tarjeta?.disponible);

  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('classCheckout', { bookingId: booking.id });
      if (response.data?.url) {
        sessionStorage.setItem('pending_stripe_booking_id', booking.id);
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data?.error || 'No se recibió URL de pago');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert(error.message || 'Error al procesar el pago. Inténtalo de nuevo.');
      setProcessing(false);
    }
  };

  const handleBizumConfirm = async () => {
    setProcessing(true);
    try {
      await base44.entities.Booking.update(booking.id, {
        payment_status: 'pending_confirmation',
        payment_method: 'bizum',
      });

      await base44.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'payment_pending_confirmation',
        title: 'Confirma el pago de una clase',
        message: cobraMenttio
          ? `${booking.student_name} dice haber enviado ${eur(booking.price)} por Bizum a Menttio por la clase de ${booking.subject_name}. Menttio lo confirmará y te abonará tu parte a final de mes.`
          : `${booking.student_name} dice haber enviado ${eur(booking.price)} por Bizum por la clase de ${booking.subject_name}. Confirma si lo has recibido.`,
        related_id: booking.id,
        link_page: 'TeacherCalendar',
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

  /** Lo que se lleva cada uno con cada método. Es el argumento honesto para elegir Bizum. */
  const Desglose = () => {
    if (!d) return null;
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
        <div className="bg-gray-50 px-3 py-2 font-medium text-[#404040] flex items-center gap-2">
          <Info size={14} aria-hidden="true" />
          A dónde va tu dinero
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="text-left px-3 py-1 font-normal"></th>
              <th className="text-right px-3 py-1 font-normal">Tarjeta</th>
              <th className="text-right px-3 py-1 font-normal">Bizum</th>
            </tr>
          </thead>
          <tbody className="text-[#404040]">
            <tr className="border-t border-gray-100">
              <td className="px-3 py-1.5">Para tu profesor</td>
              <td className="px-3 py-1.5 text-right font-semibold">{eur(d.profesor_tarjeta)}</td>
              <td className="px-3 py-1.5 text-right font-semibold">{eur(d.profesor_bizum)}</td>
            </tr>
            {d.comision_pct > 0 && (
              <tr className="border-t border-gray-100">
                <td className="px-3 py-1.5">Menttio ({d.comision_pct}%)</td>
                <td className="px-3 py-1.5 text-right">{eur(d.comision)}</td>
                <td className="px-3 py-1.5 text-right">{eur(d.comision)}</td>
              </tr>
            )}
            <tr className="border-t border-gray-100 text-gray-500">
              <td className="px-3 py-1.5">Comisión de Stripe</td>
              <td className="px-3 py-1.5 text-right">≈ {eur(d.stripe_estimado)}</td>
              <td className="px-3 py-1.5 text-right">0€</td>
            </tr>
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
          La comisión de Stripe la asume el profesor, así que por Bizum recibe{' '}
          <strong>{eur(d.stripe_estimado)} más</strong>. Es una estimación: el importe exacto
          depende de la tarjeta.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Realizar pago</DialogTitle>
          <DialogDescription>
            Clase de {booking?.subject_name} — {eur(booking?.price)}
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : !selectedMethod ? (
          <div className="space-y-3 py-4">
            {tarjetaDisponible ? (
              <button
                onClick={() => setSelectedMethod('stripe')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#41f2c0] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CreditCard className="text-purple-600" size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#404040]">Tarjeta de crédito o débito</h3>
                    <p className="text-sm text-gray-500">Pago seguro con Stripe, al momento</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 text-left opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <CreditCard className="text-gray-400" size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-400">Tarjeta de crédito o débito</h3>
                    <p className="text-xs text-gray-400">
                      {opciones?.tarjeta?.motivo_no_disponible || 'No disponible para esta clase'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedMethod('bizum')}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#41f2c0] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                  <Smartphone className="text-[#0d7a5f]" size={24} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#404040]">Bizum</h3>
                  <p className="text-sm text-gray-500">
                    {cobraMenttio ? 'A Menttio, que abona al profesor' : 'Directo a tu profesor'}
                  </p>
                  {d?.stripe_estimado > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800 text-xs">
                      Tu profesor recibe {eur(d.stripe_estimado)} más
                    </Badge>
                  )}
                </div>
              </div>
            </button>

            <Desglose />
          </div>
        ) : selectedMethod === 'stripe' ? (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <CreditCard className="mx-auto text-purple-600 mb-3" size={48} aria-hidden="true" />
              <h3 className="font-semibold text-[#404040] mb-2">Pago con tarjeta</h3>
              <p className="text-sm text-gray-500 mb-4">
                Te llevamos a la pasarela segura de Stripe
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-2xl font-bold text-[#404040]">{eur(booking?.price)}</p>
              </div>
            </div>

            {d && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                Pagando con tarjeta, Stripe cobra una comisión de aproximadamente{' '}
                <strong>{eur(d.stripe_estimado)}</strong> que se descuenta de lo que recibe tu
                profesor. Por Bizum no hay ninguna.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedMethod(null)} className="flex-1">
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
                  <Smartphone className="mx-auto text-[#0d7a5f] mb-3" size={48} aria-hidden="true" />
                  <h3 className="font-semibold text-[#404040] mb-2">Pago por Bizum</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {cobraMenttio
                      ? 'Envía el pago a Menttio, que abona al profesor su parte'
                      : 'Envía el pago al teléfono de tu profesor'}
                  </p>
                </div>

                <div className="bg-[#41f2c0]/10 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">A nombre de</p>
                    <p className="font-semibold text-[#404040]">
                      {opciones?.bizum?.titular || booking?.teacher_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Teléfono Bizum</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg text-[#404040]">
                        {opciones?.bizum?.telefono || '---'}
                      </p>
                      {opciones?.bizum?.telefono && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Copiar el número de Bizum"
                          onClick={() => copyToClipboard(opciones.bizum.telefono)}
                        >
                          <Copy size={14} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Importe</p>
                    <p className="text-2xl font-bold text-[#0d7a5f]">{eur(booking?.price)}</p>
                  </div>
                </div>

                {cobraMenttio && d && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                    De estos {eur(d.precio)}, tu profesor recibe <strong>{eur(d.profesor_bizum)}</strong> y
                    Menttio se queda {eur(d.comision)} ({d.comision_pct}%). Con Bizum el abono al
                    profesor se hace <strong>a final de mes</strong>, no después de cada clase.
                  </div>
                )}

                <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-800">
                  Abre tu aplicación de Bizum, envía el pago al número indicado y confírmalo aquí.
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedMethod(null)} className="flex-1">
                    Volver
                  </Button>
                  <Button
                    onClick={() => setBizumConfirmed(true)}
                    className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040]"
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
                <CheckCircle className="mx-auto text-[#0d7a5f] mb-3" size={64} aria-hidden="true" />
                <h3 className="font-semibold text-[#404040] mb-2">¿Has enviado el pago?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  {cobraMenttio
                    ? 'Menttio confirmará la recepción y marcará la clase como pagada.'
                    : 'Tu profesor deberá confirmar la recepción para marcar la clase como pagada.'}
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBizumConfirmed(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBizumConfirm}
                    disabled={processing}
                    className="flex-1 bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040]"
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
