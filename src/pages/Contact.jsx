import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Send, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await base44.functions.invoke('sendContactEmail', {
        name: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        message: formData.message
      });

      setSent(true);
      setFormData({ name: '', lastName: '', email: '', message: '' });
      
      setTimeout(() => {
        setSent(false);
      }, 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const isFormValid = formData.name && formData.lastName && formData.email && formData.message;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-4 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <a href="/Home">
          <Button
            variant="ghost"
            className="mb-4 text-gray-500 hover:text-[#404040]"
          >
            <ArrowLeft size={18} className="mr-2" />
            Volver
          </Button>
        </a>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 rounded-full bg-[#41f2c0]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="text-[#41f2c0]" size={40} />
            </div>
            <CardTitle className="text-3xl font-bold text-[#404040]">
              Contáctanos
            </CardTitle>
            <p className="text-gray-500 mt-2">
              ¿Tienes alguna pregunta? Estamos aquí para ayudarte
            </p>
          </CardHeader>

          <CardContent>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-green-600" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-[#404040] mb-2">
                  ¡Mensaje enviado!
                </h3>
                <p className="text-gray-600">
                  Te responderemos lo antes posible a tu correo electrónico.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Nombre *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Apellidos *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Tus apellidos"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Correo Electrónico *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#404040] mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Cuéntanos más sobre tu consulta..."
                    className="w-full p-3 border rounded-lg resize-none h-32 focus:ring-2 focus:ring-[#41f2c0] focus:border-transparent outline-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!isFormValid || sending}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-6 text-lg rounded-xl"
                >
                  {sending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Enviar mensaje
                      <Send className="ml-2" size={18} />
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-500">
                  También puedes escribirnos directamente a{' '}
                  <a href="mailto:menttio@menttio.com" className="text-[#41f2c0] font-medium hover:underline">
                    menttio@menttio.com
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}