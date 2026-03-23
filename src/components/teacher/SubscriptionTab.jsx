import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StripeConnectCard from './StripeConnectCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  Loader2,
  RefreshCw,
  Crown,
  Zap
} from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';
import { es } from 'date-fns/locale';

const CARD_BRANDS = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 American Express',
  discover: '💳 Discover',
};

export default function SubscriptionTab({ profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getSubscriptionInfo');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = () => {
    if (data?.portal_url) {
      setRedirecting(true);
      window.open(data.portal_url, '_blank');
      setTimeout(() => setRedirecting(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#41f2c0]" size={36} />
      </div>
    );
  }

  const isActive = data?.subscription_active;
  const isTrial = data?.trial_active;
  const plan = data?.subscription_plan || profile?.subscription_plan || 'basic';
  const planPrice = plan === 'premium' ? '36,99€' : '14,99€';
  const details = data?.subscription_details;

  // Dates
  const renewalDate = details?.current_period_end
    ? format(fromUnixTime(details.current_period_end), "d 'de' MMMM 'de' yyyy", { locale: es })
    : data?.subscription_expires
      ? format(new Date(data.subscription_expires), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;

  const trialEndDate = data?.subscription_details?.trial_end
    ? format(fromUnixTime(data.subscription_details.trial_end), "d 'de' MMMM 'de' yyyy", { locale: es })
    : data?.trial_end_date
      ? format(new Date(data.trial_end_date), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;

  const startDate = details?.current_period_start
    ? format(fromUnixTime(details.current_period_start), "d 'de' MMMM 'de' yyyy", { locale: es })
    : null;

  const statusLabel = () => {
    if (!isActive) return { label: 'Sin suscripción', color: 'bg-gray-100 text-gray-600' };
    if (isTrial) return { label: 'Período de prueba', color: 'bg-blue-100 text-blue-700' };
    if (details?.cancel_at_period_end) return { label: 'Cancela al final del período', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Activa', color: 'bg-green-100 text-green-700' };
  };

  const status = statusLabel();

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {plan === 'premium' ? <Crown className="text-yellow-500" size={20} /> : <Zap className="text-[#41f2c0]" size={20} />}
              Plan {plan === 'premium' ? 'Premium' : 'Básico'}
            </CardTitle>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          <CardDescription>Información de tu suscripción actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="text-green-600 shrink-0" size={20} />
                <div>
                  <p className="font-medium text-green-800">Suscripción {isTrial ? 'de prueba' : ''} activa</p>
                  {isTrial && trialEndDate && (
                    <p className="text-sm text-green-700">Tu prueba gratuita finaliza el {trialEndDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-gray-500">Inicio del período</p>
                      <p className="text-sm font-medium text-[#404040]">{startDate}</p>
                    </div>
                  </div>
                )}
                {renewalDate && (
                  <div className="flex items-start gap-3">
                    <RefreshCw className="text-gray-400 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-gray-500">
                        {details?.cancel_at_period_end ? 'Finaliza el' : 'Próxima renovación'}
                      </p>
                      <p className="text-sm font-medium text-[#404040]">{renewalDate}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Zap className="text-gray-400 mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">Plan</p>
                    <p className="text-sm font-medium text-[#404040] capitalize">{plan}</p>
                  </div>
                </div>
                {details?.status && (
                  <div className="flex items-start gap-3">
                    <Clock className="text-gray-400 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-gray-500">Estado en Stripe</p>
                      <p className="text-sm font-medium text-[#404040] capitalize">{details.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="text-gray-500 shrink-0" size={20} />
              <p className="text-gray-700 text-sm">No tienes ninguna suscripción activa en este momento.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage via Stripe Portal */}
      {data?.portal_url && (
        <Card className="border-[#41f2c0]/30 bg-[#41f2c0]/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#404040]">Gestionar suscripción</p>
              <p className="text-sm text-gray-500 mt-0.5">Cambia tu método de pago, cancela o actualiza tu plan desde el portal de Stripe</p>
            </div>
            <Button
              onClick={handlePortal}
              disabled={redirecting}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white shrink-0"
            >
              {redirecting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <ExternalLink size={16} className="mr-2" />
                  Gestionar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stripe Connect - cobros de clases */}
      <StripeConnectCard />

      {!isActive && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-orange-800">Sin suscripción activa</p>
              <p className="text-sm text-orange-700 mt-0.5">Activa tu suscripción para seguir usando la plataforma</p>
            </div>
            <Button
              onClick={() => window.location.href = '/RenewSubscription'}
              className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            >
              Activar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}