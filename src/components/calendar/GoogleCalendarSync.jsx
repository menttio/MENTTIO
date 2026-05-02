import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarSync({ userEmail, userType, returnUrl, onConnected }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  const checkConnection = async () => {
    try {
      const entity = userType === 'teacher' ? 'Teacher' : 'Student';
      const users = await base44.entities[entity].filter({ user_email: userEmail });
      if (users.length > 0) {
        setConnected(users[0].google_calendar_connected || false);
        return users[0].google_calendar_connected || false;
      }
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
    }
    return false;
  };

  useEffect(() => {
    if (!userEmail) return;

    const params = new URLSearchParams(window.location.search);
    const calendarConnected = params.get('calendar_connected');
    const calendarError = params.get('calendar_error');
    const detail = params.get('detail');

    // Clean URL params immediately
    if (calendarConnected || calendarError) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (calendarConnected === 'true') {
      // Re-fetch from DB to confirm tokens were saved
      checkConnection().then((isConnected) => {
        setLoading(false);
        if (isConnected) {
          showToast('success', '¡Google Calendar conectado correctamente!');
          if (onConnected) onConnected();
        } else {
          showToast('error', 'La autorización se completó pero no se pudo confirmar la conexión. Inténtalo de nuevo.');
        }
      });
      return;
    }

    if (calendarError) {
      const errorMessages = {
        token_exchange_failed: 'Fallo al intercambiar el código con Google',
        invalid_state: 'Parámetro de seguridad inválido',
        google_denied: 'Acceso denegado por Google',
        no_code: 'Google no devolvió código de autorización',
        user_not_found: 'No se encontró tu perfil en el sistema',
        update_failed: 'Error al guardar los tokens en la base de datos',
      };
      const message = errorMessages[calendarError] || 'Error al conectar Google Calendar';
      const fullMessage = detail ? `${message}: ${decodeURIComponent(detail)}` : message;
      setLoading(false);
      showToast('error', fullMessage);
      checkConnection().then(isConnected => setConnected(isConnected));
      return;
    }

    checkConnection().then(() => setLoading(false));
  }, [userEmail, userType]);

  const handleConnect = async () => {
    setToggling(true);
    try {
      const currentReturnUrl = returnUrl || window.location.pathname;
      const response = await base44.functions.invoke('getGoogleOAuthUrl', {
        userType,
        returnUrl: currentReturnUrl,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error starting OAuth:', error);
      showToast('error', 'Error al iniciar la conexión con Google');
      setToggling(false);
    }
  };

  const handleDisconnect = async () => {
    setToggling(true);
    try {
      await base44.functions.invoke('toggleGoogleCalendar', { connect: false });
      setConnected(false);
      showToast('success', 'Google Calendar desconectado');
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      showToast('error', 'Error al desconectar');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="animate-spin" size={14} />
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {toast && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
            : <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
          }
          <span className="break-words">{toast.message}</span>
        </div>
      )}

      <Button
        onClick={connected ? handleDisconnect : handleConnect}
        disabled={toggling}
        variant="outline"
        size="sm"
        className={connected ? "text-green-600 border-green-200 hover:bg-green-50" : ""}
      >
        {toggling ? (
          <Loader2 className="animate-spin mr-2" size={14} />
        ) : (
          <Calendar className="mr-2" size={14} />
        )}
        {connected ? (
          <>Sincronizado <X size={12} className="ml-1" /></>
        ) : (
          'Sincronizar Google Calendar'
        )}
      </Button>
    </div>
  );
}