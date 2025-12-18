import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Calendar, 
  MessageCircle, 
  Clock, 
  X,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const notificationIcons = {
  booking_new: Calendar,
  booking_modified: Calendar,
  booking_cancelled: AlertCircle,
  message_new: MessageCircle,
  reminder_24h: Clock
};

const notificationColors = {
  booking_new: 'text-[#41f2c0]',
  booking_modified: 'text-blue-500',
  booking_cancelled: 'text-red-500',
  message_new: 'text-purple-500',
  reminder_24h: 'text-orange-500'
};

export default function NotificationList({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onClose 
}) {
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link_page) {
      navigate(createPageUrl(notification.link_page));
      onClose();
    }
  };

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="max-h-[500px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <h3 className="font-semibold text-[#404040]">Notificaciones</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-[#41f2c0] hover:text-[#35d4a7] text-xs"
          >
            <CheckCheck size={14} className="mr-1" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Notifications */}
      <div className="overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification, idx) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const colorClass = notificationColors[notification.type] || 'text-gray-500';

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    !notification.is_read && "bg-[#41f2c0]/5"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      !notification.is_read ? "bg-[#41f2c0]/10" : "bg-gray-100"
                    )}>
                      <Icon size={18} className={colorClass} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "text-sm",
                          !notification.is_read ? "font-semibold text-[#404040]" : "font-medium text-gray-600"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-[#41f2c0] flex-shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-sm text-gray-500 line-clamp-2 mb-1">
                        {notification.message}
                      </p>

                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.created_date), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 text-sm">No tienes notificaciones</p>
          </div>
        )}
      </div>
    </div>
  );
}