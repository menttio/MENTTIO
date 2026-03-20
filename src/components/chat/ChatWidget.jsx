import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Maximize2, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy el asistente de Menttio 👋 Estoy aquí para explicarte cómo funciona la plataforma y resolver todas tus dudas. ¿En qué te puedo ayudar?',
};


export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Show tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!tooltipDismissed && !isOpen) {
        setShowTooltip(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Hide tooltip when chat opens
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const dismissTooltip = (e) => {
    e.stopPropagation();
    setShowTooltip(false);
    setTooltipDismissed(true);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const allMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage];

      const response = await base44.functions.invoke('chatAssistant', {
        messages: allMessages,
      });

      const content = response?.data?.content || '';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: content || 'No pude generar una respuesta. ¿Puedes repetirlo?',
      }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'En este momento no puedo responder. ¡Prueba de nuevo en un momento!',
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openFullScreen = () => {
    window.open('/beta', '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              width: 'min(380px, calc(100vw - 32px))',
              height: 'min(500px, calc(100vh - 120px))',
            }}
          >
            {/* Header */}
            <div className="bg-[#404040] px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img src="https://media.base44.com/images/public/694471e9c204eb0088437b85/3fbbdcae9_logo1.png" alt="Menttio" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm leading-tight">Asistente Menttio</p>
                <p className="text-white/70 text-xs">Siempre disponible</p>
              </div>
              <button
                onClick={openFullScreen}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
                title="Abrir en pantalla completa"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-[#f7f7f7]">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-1.5`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-0.5">
                        <img src="https://media.base44.com/images/public/694471e9c204eb0088437b85/3fbbdcae9_logo1.png" alt="Menttio" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#41f2c0] text-white rounded-tr-sm'
                          : 'bg-white text-[#404040] rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start items-end gap-1.5"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img src="https://media.base44.com/images/public/694471e9c204eb0088437b85/3fbbdcae9_logo1.png" alt="Menttio" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
                      <div className="flex gap-1 items-center h-3">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2 items-end bg-white flex-shrink-0">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                rows={1}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#404040] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#41f2c0] focus:border-transparent max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.4' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-full bg-[#41f2c0] hover:bg-[#35d4a7] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
              >
                {isTyping ? (
                  <Loader2 size={14} className="text-white animate-spin" />
                ) : (
                  <Send size={14} className="text-white" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-2 border border-gray-100"
          >
            <span className="text-sm text-[#404040] font-medium whitespace-nowrap">¿Tienes dudas? ¡Pregúntame!</span>
            <button onClick={dismissTooltip} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
              <X size={14} />
            </button>
            {/* Arrow */}
            <div className="absolute -bottom-2 right-6 w-4 h-2 overflow-hidden">
              <div className="w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45 translate-y-[-6px] translate-x-[2px]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
        onClick={() => setIsOpen(prev => !prev)}
        className="w-14 h-14 rounded-full bg-[#404040] hover:bg-[#303030] shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white overflow-hidden"
        style={{ boxShadow: '0 4px 20px rgba(64, 64, 64, 0.4)' }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <img src="https://media.base44.com/images/public/694471e9c204eb0088437b85/3fbbdcae9_logo1.png" alt="Menttio" className="w-full h-full object-cover rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}