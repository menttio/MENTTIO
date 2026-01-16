import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      const newState = !connected;
      await base44.functions.invoke('toggleGoogleCalendar', { connect: newState });
      setConnected(newState);
    } catch (error) {
      console.error('Error toggling Google Calendar:', error);
      alert('Error al cambiar la sincronización');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-[#41f2c0]" size={24} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="text-[#41f2c0]" size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#404040] mb-2">
              Google Calendar
            </h3>
            
            <p className="text-sm text-gray-500 mb-4">
              {userType === 'teacher' 
                ? 'Sincroniza tus clases y bloquea automáticamente horarios ocupados en tu calendario personal.'
                : 'Sincroniza tus clases con tu calendario personal de Google.'}
            </p>

            <AnimatePresence mode="wait">
              {connected ? (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check size={16} />
                    Conectado correctamente
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleToggle}
                    disabled={toggling}
                    className="w-full sm:w-auto"
                  >
                    {toggling ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      <X size={16} className="mr-2" />
                    )}
                    Desconectar
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={handleToggle}
                    disabled={toggling}
                    className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white w-full sm:w-auto"
                  >
                    {toggling ? (
                      <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                      <Calendar size={16} className="mr-2" />
                    )}
                    Conectar Google Calendar
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}