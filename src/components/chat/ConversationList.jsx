import React from 'react';
import { User, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ConversationList({ 
  conversations, 
  selectedConversation, 
  onSelectConversation,
  userRole 
}) {
  return (
    <div className="space-y-2">
      {conversations.map((conversation, idx) => {
        const isSelected = selectedConversation?.id === conversation.id;
        const otherPersonName = userRole === 'student' 
          ? conversation.teacher_name 
          : conversation.student_name;
        
        const unreadCount = userRole === 'student' 
          ? conversation.unread_count_student 
          : conversation.unread_count_teacher;

        return (
          <motion.button
            key={conversation.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectConversation(conversation)}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all",
              isSelected 
                ? "bg-[#41f2c0]/10 border-2 border-[#41f2c0]" 
                : "bg-white hover:bg-gray-50 border-2 border-transparent"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0">
                <User className="text-white" size={20} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-[#404040] truncate">
                    {otherPersonName}
                  </h3>
                  {conversation.last_message_date && (
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(conversation.last_message_date), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.last_message || 'Sin mensajes aún'}
                  </p>
                  {unreadCount > 0 && (
                    <Badge className="bg-[#41f2c0] text-white flex-shrink-0">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}