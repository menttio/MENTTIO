import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy el asistente de Menttio 👋 Estoy aquí para explicarte cómo funciona la plataforma y resolver todas tus dudas. ¿En qué te puedo ayudar?',
};

const SYSTEM_PROMPT = `Eres el asistente de ventas y soporte de Menttio, una plataforma todo en uno para profesores particulares. Estás hablando con profesores que han recibido un mensaje de prospección y quieren saber más antes de registrarse.

KNOWLEDGE BASE:
Menttio es una plataforma todo en uno para profesores particulares. El profesor solo configura sus materias, precio y disponibilidad — Menttio gestiona el resto.

FUNCIONALIDADES:
- Agenda inteligente: el profesor define su disponibilidad una vez. Los alumnos ven los huecos libres y reservan solos, sin solapamientos ni WhatsApps.
- Reservas automáticas: los alumnos reservan, confirman y cancelan sin que el profesor intervenga.
- Pagos integrados: cobro centralizado y automático. Sin perseguir transferencias.
- Clases grabadas: las sesiones se graban automáticamente y quedan accesibles para el alumno.
- Materiales accesibles: el profesor sube apuntes una vez, los alumnos los encuentran organizados siempre.
- Gestión de alumnos: historial, seguimiento y progreso de cada alumno en un solo lugar.
- Comunicación centralizada: chat con alumnos integrado en la plataforma.
- Panel de control: ingresos, horas impartidas y actividad por alumno.

PRECIOS:
- Alumnos: GRATIS siempre. Solo pagan las clases al profesor.
- Profesores: Plan Premium 36,99€/mes. Sin comisiones por clase.
- Prueba beta especial: 30 días gratis a cambio de feedback.

REGISTRO PROFESOR: https://menttio.com/TeacherSignup (5 minutos, añades materias, precio y disponibilidad)

CÓMO FUNCIONA PARA EL ALUMNO: Se registra gratis, busca al profesor, reserva en los huecos disponibles, paga online, accede a grabaciones y materiales.

MENTTIO NO: no interviene en el contenido de las clases, no fija precios, no cobra comisión por clase, no decide los horarios del profesor.

INSTRUCCIONES DE COMPORTAMIENTO:
- Responde de forma natural, cercana, como un fundador explicando su producto.
- Respuestas cortas y directas. Máximo 3-4 frases por mensaje.
- Si el profesor muestra interés, dale el link de registro: https://menttio.com/TeacherSignup
- Si tiene dudas, resuélvelas con honestidad.
- Si no le interesa, responde con amabilidad.
- No uses listas largas ni bullet points. Responde conversacionalmente.
- Responde siempre en español.`;

export default function BetaChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const conversationHistory = [...messages.filter(m => m.id !== 'welcome'), userMessage]
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
        .join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nHistorial de conversación:\n${conversationHistory}\n\nResponde al último mensaje del usuario de forma breve y conversacional.`,
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof response === 'string' ? response : response?.text || 'Lo siento, no pude procesar tu mensaje. ¿Puedes repetirlo?',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ups, algo falló por mi parte. ¡Prueba de nuevo en un momento!',
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

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#404040]" translate="no">
              Men<span className="text-[#41f2c0]">π</span>io
            </h1>
            <p className="text-xs text-gray-500 leading-tight">Resuelve tus dudas sobre Menttio</p>
          </div>
          <a
            href="https://menttio.com/TeacherSignup"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap"
          >
            Empieza gratis 30 días →
          </a>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#41f2c0] flex items-center justify-center text-white font-bold text-sm mr-2 mt-1 flex-shrink-0">
                    M
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-[#41f2c0] flex items-center justify-center text-white font-bold text-sm mr-2 flex-shrink-0">
                  M
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
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
      </main>

      {/* CTA mobile */}
      <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-2">
        <a
          href="https://menttio.com/TeacherSignup"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-sm font-semibold w-full py-2.5 rounded-full transition-colors"
        >
          Empieza tu prueba gratuita de 30 días →
        </a>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-[#404040] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#41f2c0] focus:border-transparent max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-[#41f2c0] hover:bg-[#35d4a7] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            {isTyping ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Send size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}