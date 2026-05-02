import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarSync({ userEmail, userType, returnUrl }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const entity = userType === 'teacher' ? 'Teacher' : 'Student';
        const users = await base44.entities[entity].filter({ user_email: userEmail });
        if (users.length > 0) {
          setConnected(users[0].google_calendar_connected || false);
        }
      } catch (error) {
        console.error('Error checking Google Calendar connection:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      // Check for callback result params in URL
      const params = new URLSearchParams(window.location.search);
      if (params.get('calendar_connected') === 'true') {
        setConnected(true);
        setLoading(false);
        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        return;
      }
      if (params.get('calendar_error') === 'true') {
        setLoading(false);
        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        return;
      }
      checkConnection();
    }
  }, [userEmail, userType]);

  const handleConnect = async () => {
    setToggling(true);
    try {
      const currentReturnUrl = returnUrl || window.location.pathname;
      const response = await base44.functions.invoke('getGoogleOAuthUrl', {
        userType,
        returnUrl: currentReturnUrl,
      });
      const authUrl = response.data.url;
      // Full redirect — no popup, no COOP issues
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting OAuth:', error);
      alert('Error al iniciar la conexión');
      setToggling(false);
    }
  };

  const handleDisconnect = async () => {
    setToggling(true);
    try {
      await base44.functions.invoke('toggleGoogleCalendar', { connect: false });
      setConnected(false);
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      alert('Error al desconectar');
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
        <>
          Sincronizado
          <X size={12} className="ml-1" />
        </>
      ) : (
        'Sincronizar Google Calendar'
      )}
    </Button>
  );
}