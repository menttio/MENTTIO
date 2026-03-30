import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Calendar, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCalendarSync({ userEmail, userType }) {
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
      checkConnection();
    }
  }, [userEmail, userType]);

  const handleToggle = async () => {
    if (!connected) {
      setToggling(true);
      
      try {
        const response = await base44.functions.invoke('getGoogleOAuthUrl', { userType });
        const authUrl = response.data.url;
        
        const popup = window.open(
          authUrl,
          'Google Calendar',
          'width=600,height=700,scrollbars=yes'
        );

        const handleMessage = (event) => {
          if (event.data.type === 'oauth_success') {
            setConnected(true);
            toast.success('Google Calendar conectado correctamente');
            window.removeEventListener('message', handleMessage);
            setToggling(false);
          } else if (event.data.type === 'oauth_error') {
            toast.error('Error al conectar con Google Calendar');
            window.removeEventListener('message', handleMessage);
            setToggling(false);
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setToggling(false);
          }
        }, 1000);

      } catch (error) {
        console.error('Error starting OAuth:', error);
        toast.error('Error al iniciar la conexión');
        setToggling(false);
      }
    } else {
      setToggling(true);
      try {
        await base44.functions.invoke('toggleGoogleCalendar', { connect: false });
        setConnected(false);
        toast.success('Google Calendar desconectado');
      } catch (error) {
        console.error('Error disconnecting Google Calendar:', error);
        toast.error('Error al desconectar Google Calendar');
      } finally {
        setToggling(false);
      }
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
      onClick={handleToggle}
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