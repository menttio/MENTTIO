import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function PushNotificationSetup({ userEmail }) {
  useEffect(() => {
    const setupPushNotifications = async () => {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones');
        return;
      }

      // Check current permission
      if (Notification.permission === 'default') {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Permiso de notificaciones concedido');
        }
      }

      // Subscribe to new notifications
      if (Notification.permission === 'granted') {
        const unsubscribe = base44.entities.Notification.subscribe((event) => {
          if (event.type === 'create' && event.data.user_email === userEmail) {
            // Show browser notification
            new Notification(event.data.title, {
              body: event.data.message,
              icon: '/icon.png',
              badge: '/badge.png',
              tag: event.data.id,
              requireInteraction: false,
            });
          }
        });

        return unsubscribe;
      }
    };

    setupPushNotifications();
  }, [userEmail]);

  return null;
}