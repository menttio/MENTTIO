import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Banknote,
  RefreshCw,
  Clock,
  Info
} from 'lucide-react';

export default function StripeConnectCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if returning from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    const connectParam = urlParams.get('connect');
    if (connectParam) {
      // Remove param from URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=pago');
    }
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getStripeConnectStatus');
      setStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('connectStripeAccount');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con Stripe. Inténtalo de nuevo.');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[#41f2c0]" size={28} />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected;
  const isEnabled = status?.enabled;
  const needsAction = isConnected && !isEnabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="text-[#41f2c0]" size={20} />
            Cobros de clases
          </CardTitle>
          {isConnected && (
            <Badge className={isEnabled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
              {isEnabled ? 'Activo' : 'Pendiente'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Configura tu cuenta para recibir los pagos de los alumnos directamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Info box about Stripe fee */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            Stripe cobra una comisión de aprox. <strong>1,5% + 0,25€</strong> por cada pago con tarjeta (tarjetas europeas).
            El alumno paga el importe completo de la clase, y tú recibes ese importe <strong>menos la comisión de Stripe</strong>.
            Menttio no aplica ninguna comisión adicional.
          </p>
        </div>

        {!isConnected && (
          <>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="text-gray-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Sin cuenta de cobros configurada</p>
                <p>Para recibir los pagos de tus alumnos con tarjeta directamente en tu cuenta bancaria, necesitas conectar una cuenta Stripe. Es gratis y solo tarda unos minutos.</p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
            >
              {connecting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <ExternalLink size={16} className="mr-2" />
              )}
              {connecting ? 'Redirigiendo a Stripe...' : 'Configurar cuenta de cobros'}
            </Button>
          </>
        )}

        {needsAction && (
          <>
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Configuración incompleta</p>
                <p>Necesitas completar el proceso de verificación en Stripe para poder recibir pagos.</p>
                {status?.requirements?.length > 0 && (
                  <p className="mt-1 text-xs text-orange-700">Información pendiente: {status.requirements.join(', ')}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {connecting ? <Loader2 className="animate-spin" size={16} /> : 'Completar verificación'}
              </Button>
              <Button variant="outline" onClick={loadStatus} size="icon">
                <RefreshCw size={16} />
              </Button>
            </div>
          </>
        )}

        {isEnabled && (
          <>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Cuenta activa</p>
                <p>Los pagos con tarjeta de tus alumnos se transferirán directamente a tu cuenta bancaria. Menos la comisión de Stripe (~1,5% + 0,25€).</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Cobros</p>
                <p className="font-medium text-green-700 flex items-center gap-1">
                  <CheckCircle size={14} /> Habilitados
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Transferencias</p>
                <p className="font-medium text-green-700 flex items-center gap-1">
                  <CheckCircle size={14} /> Habilitadas
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? <Loader2 className="animate-spin mr-2" size={14} /> : <ExternalLink size={14} className="mr-2" />}
              Gestionar cuenta en Stripe
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}