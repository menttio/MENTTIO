import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PaymentTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getStripeSubscriptionInfo');
      setData(res.data);
    } catch (err) {
      setError('No se pudo cargar la información de suscripción.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await base44.functions.invoke('cancelTeacherSubscription');
      setCancelResult(res.data);
      await loadData();
    } catch (err) {
      setError('Error al cancelar la suscripción.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    return format(new Date(timestamp * 1000), "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  const formatDateStr = (str) => {
    if (!str) return '—';
    return format(new Date(str), "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  const getStatusBadge = (status) => {
    const map = {
      trialing: { label: 'Período de prueba', color: 'bg-blue-100 text-blue-700' },
      active: { label: 'Activa', color: 'bg-green-100 text-green-700' },
      past_due: { label: 'Pago pendiente', color: 'bg-orange-100 text-orange-700' },
      canceled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
      incomplete: { label: 'Incompleta', color: 'bg-gray-100 text-gray-700' },
    };
    const item = map[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.color}`}>{item.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#41f2c0]" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  const teacher = data?.teacher;
  const sub = data?.subscription;

  const planLabel = teacher?.subscription_plan === 'premium' ? 'Premium' : 'Básico';
  const planColor = teacher?.subscription_plan === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-[#41f2c0]/20 text-[#35d4a7]';

  const isInTrial = sub?.status === 'trialing';
  const isCancellable = sub && sub.status !== 'canceled' && !sub.cancel_at_period_end;

  return (
    <div className="space-y-4">

      {/* Cancel result message */}
      {cancelResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600 shrink-0" size={20} />
          <span className="text-green-800 text-sm font-medium">
            {cancelResult.cancelledImmediately
              ? 'Suscripción cancelada inmediatamente. Tu acceso ha terminado.'
              : `Suscripción cancelada. Tendrás acceso hasta el ${formatDateStr(cancelResult.cancelsAt)}.`}
          </span>
        </div>
      )}

      {/* Plan info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#41f2c0]" />
            Plan de suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Plan actual</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${planColor}`}>{planLabel}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Estado</span>
            {sub ? getStatusBadge(sub.status) : <span className="text-gray-400 text-sm">Sin suscripción</span>}
          </div>

          {sub?.cancel_at_period_end && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <AlertCircle size={16} className="text-orange-500 shrink-0" />
              <span className="text-sm text-orange-700">
                Cancelación programada para el <strong>{formatDate(sub.current_period_end)}</strong>. Tendrás acceso hasta esa fecha.
              </span>
            </div>
          )}

          {sub?.amount != null && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Precio</span>
              <span className="font-semibold text-[#404040]">{(sub.amount / 100).toFixed(2)} {sub.currency?.toUpperCase()}/mes</span>
            </div>
          )}

          {isInTrial && sub.trial_end && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm flex items-center gap-1"><Clock size={14} /> Prueba gratuita hasta</span>
              <span className="font-medium text-blue-600">{formatDate(sub.trial_end)}</span>
            </div>
          )}

          {!isInTrial && sub?.current_period_end && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm flex items-center gap-1"><Calendar size={14} /> Próxima factura</span>
              <span className="font-medium text-[#404040]">{formatDate(sub.current_period_end)}</span>
            </div>
          )}

          {!data?.hasSubscription && (
            <p className="text-gray-400 text-sm text-center py-4">No tienes una suscripción activa en Stripe.</p>
          )}
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de facturación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Email de facturación</span>
            <span className="text-sm font-medium text-[#404040]">{teacher?.user_email || '—'}</span>
          </div>
          {teacher?.stripe_customer_id && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">ID de cliente Stripe</span>
              <span className="text-xs font-mono text-gray-400">{teacher.stripe_customer_id}</span>
            </div>
          )}
          <p className="text-xs text-gray-400 pt-2">
            Para cambiar el método de pago o descargar facturas, contacta con soporte.
          </p>
        </CardContent>
      </Card>

      {/* Cancel subscription */}
      {isCancellable && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 text-base">Cancelar suscripción</CardTitle>
            <CardDescription>
              {isInTrial
                ? 'Estás en período de prueba. Si cancelas ahora, perderás el acceso inmediatamente.'
                : 'Tu suscripción se cancelará al final del período actual y no se te cobrará más.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 w-full">
                  <XCircle size={16} className="mr-2" />
                  {isInTrial ? 'Cancelar y perder acceso ahora' : 'Cancelar suscripción'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isInTrial
                      ? 'Estás en período de prueba gratuito. Si confirmas, tu suscripción se cancelará inmediatamente y perderás el acceso al instante.'
                      : `Tu suscripción continuará activa hasta el ${formatDate(sub.current_period_end)}. Después de esa fecha no se realizarán más cobros y perderás el acceso.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {cancelling ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar cancelación'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}