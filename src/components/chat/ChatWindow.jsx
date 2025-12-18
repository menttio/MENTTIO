import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ChatWindow({ conversation, userRole, userId, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation) return;
    
    setLoading(true);
    try {
      const allMessages = await base44.entities.Message.filter({ 
        conversation_id: conversation.id 
      });
      
      const sortedMessages = allMessages.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
      
      setMessages(sortedMessages);
      
      // Mark messages as read
      const unreadMessages = sortedMessages.filter(
        m => !m.is_read && m.sender_type !== userRole
      );
      
      for (const msg of unreadMessages) {
        await base44.entities.Message.update(msg.id, { is_read: true });
      }
      
      // Update conversation unread count
      if (unreadMessages.length > 0) {
        const unreadField = userRole === 'student' 
          ? 'unread_count_student' 
          : 'unread_count_teacher';
        
        await base44.entities.Conversation.update(conversation.id, {
          [unreadField]: 0
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    setSending(true);
    try {
      const userName = userRole === 'student' 
        ? conversation.student_name 
        : conversation.teacher_name;

      await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_type: userRole,
        sender_id: userId,
        sender_name: userName,
        content: newMessage.trim(),
        is_read: false
      });

      // Update conversation
      const otherUnreadField = userRole === 'student' 
        ? 'unread_count_teacher' 
        : 'unread_count_student';
      
      const currentUnread = conversation[otherUnreadField] || 0;

      await base44.entities.Conversation.update(conversation.id, {
        last_message: newMessage.trim(),
        last_message_date: new Date().toISOString(),
        last_message_by: userRole,
        [otherUnreadField]: currentUnread + 1
      });

      // Create notification for recipient
      const recipientId = userRole === 'student' ? conversation.teacher_id : conversation.student_id;
      const recipientEmail = userRole === 'student' ? conversation.teacher_email : conversation.student_email;
      
      await base44.entities.Notification.create({
        user_id: recipientId,
        user_email: recipientEmail,
        type: 'message_new',
        title: 'Nuevo mensaje',
        message: `${userName}: ${newMessage.trim().substring(0, 50)}${newMessage.trim().length > 50 ? '...' : ''}`,
        related_id: conversation.id,
        link_page: 'Messages'
      });

      setNewMessage('');
      await loadMessages();
      onMessageSent?.();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <User size={64} className="mx-auto mb-4 opacity-50" />
          <p>Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  const otherPersonName = userRole === 'student' 
    ? conversation.teacher_name 
    : conversation.student_name;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-[#404040]">{otherPersonName}</h3>
            <p className="text-xs text-gray-500">
              {userRole === 'student' ? 'Profesor' : 'Alumno'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <AnimatePresence>
          {messages.map((message, idx) => {
            const isOwnMessage = message.sender_type === userRole;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={cn(
                  "flex",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-3",
                  isOwnMessage 
                    ? "bg-[#41f2c0] text-white" 
                    : "bg-white text-[#404040] border border-gray-100"
                )}>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    isOwnMessage ? "text-white/70" : "text-gray-400"
                  )}>
                    {format(new Date(message.created_date), "HH:mm", { locale: es })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-3">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white h-auto px-6"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Pulsa Enter para enviar, Shift + Enter para nueva línea
        </p>
      </form>
    </div>
  );
}