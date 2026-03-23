import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import NotificationList from './NotificationList';

export default function NotificationBell({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userEmail) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  // Lazy cleanup: delete read notifications older than 30 days
  useEffect(() => {
    if (isOpen && userEmail) {
      const cleanup = async () => {
        try {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          const old = await base44.entities.Notification.filter({ user_email: userEmail, is_read: true });
          const toDelete = old.filter(n => new Date(n.created_date) < cutoff);
          await Promise.all(toDelete.map(n => base44.entities.Notification.delete(n.id)));
        } catch {}
      };
      cleanup();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const allNotifications = await base44.entities.Notification.filter(
        { user_email: userEmail },
        '-created_date',
        50
      );

      // Filter out read notifications older than 30 days
      const filtered = allNotifications.filter(n => 
        !n.is_read || new Date(n.created_date) >= cutoff
      );

      const totalUnread = filtered.filter(n => !n.is_read).length;
      setNotifications(filtered);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error(error);
      setUnreadCount(0);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { is_read: true });
      // Decrement unread count immediately
      setUnreadCount(prev => Math.max(0, prev - 1));
      await loadNotifications();
    } catch (error) {
      console.error(error);
      await loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Immediately set unread count to 0
      setUnreadCount(0);
      
      // Fetch ALL unread notifications
      const allUnreadNotifications = await base44.entities.Notification.filter({ 
        user_email: userEmail,
        is_read: false
      });
      
      // Mark all as read
      if (allUnreadNotifications.length > 0) {
        await Promise.all(
          allUnreadNotifications.map(n => 
            base44.entities.Notification.update(n.id, { is_read: true })
          )
        );
      }
      
      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error(error);
      await loadNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#41f2c0] text-white text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0" align="end" sideOffset={5} alignOffset={35}>
        <NotificationList
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}