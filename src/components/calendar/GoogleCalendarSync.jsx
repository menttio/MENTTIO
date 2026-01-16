import React, { useState, useEffect } from 'react';
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
    setToggling(true);
    try {
      if (!connected) {
        // Connect using Base44 app connector
        const response = await base44.functions.invoke('getGoogleOAuthUrl', { userType });
        if (response.data.connected) {
          setConnected(true);
        }
      } else {
        // Disconnect
        await base44.functions.invoke('toggleGoogleCalendar', { connect: false });
        setConnected(false);
      }
    } catch (error) {
      console.error('Error toggling Google Calendar:', error);
      alert(connected ? 'Error al desconectar' : 'Error al conectar');
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