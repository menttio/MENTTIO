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
    if (!connected) {
      // Redirect to Google OAuth flow
      const redirectUrl = window.location.href;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(import.meta.env.VITE_GOOGLE_CLIENT_ID || '')}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/callback')}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly')}&` +
        `access_type=offline&` +
        `state=${encodeURIComponent(JSON.stringify({ userEmail, userType, redirectUrl }))}`;
      
      window.location.href = authUrl;
    } else {
      // Disconnect
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