import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationSetup({ userEmail }) {
  useEffect(() => {
    const setupPushNotifications = async () => {
      if (!userEmail) return;

      // Check if service workers and push are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications no soportadas en este navegador');
        return;
      }

      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check permission
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.log('Permiso de notificaciones denegado');
          return;
        }

        // Subscribe to push
        const publicKey = await fetch('/api/vapid-public-key')
          .then(r => r.text())
          .catch(() => null);

        if (!publicKey) {
          console.error('No se pudo obtener la clave pública VAPID');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Save subscription to database
        const existingSubscriptions = await base44.entities.PushSubscription.filter({
          user_email: userEmail
        });

        const subscriptionJSON = subscription.toJSON();
        
        // Check if this subscription already exists
        const exists = existingSubscriptions.some(sub => 
          sub.subscription.endpoint === subscriptionJSON.endpoint
        );

        if (!exists) {
          await base44.entities.PushSubscription.create({
            user_email: userEmail,
            subscription: subscriptionJSON
          });
        }

      } catch (error) {
        console.error('Error configurando push notifications:', error);
      }
    };

    setupPushNotifications();
  }, [userEmail]);

  return null;
}