import React from 'react';
import { ArrowLeft, Lock, Eye, Database, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <a href="/Home">
            <Button
              variant="ghost"
              className="mb-6 text-white hover:text-white hover:bg-white/20"
            >
              <ArrowLeft size={18} className="mr-2" />
              Volver al inicio
            </Button>
          </a>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 bg-[#404040]/80 rounded-2xl flex items-center justify-center">
              <Lock size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Política de Privacidad</h1>
              <p className="text-white/90">Última actualización: 22 de enero de 2026</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 space-y-8"
        >
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-[#404040] mb-4">Tu privacidad es importante</h2>
            <p className="text-gray-600 leading-relaxed">
              En Menπio nos tomamos muy en serio la protección de tus datos personales. Esta Política de 
              Privacidad explica qué información recopilamos, cómo la utilizamos, y tus derechos respecto 
              a tus datos personales.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Database className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">1. Información que Recopilamos</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Recopilamos diferentes tipos de información para proporcionarte nuestros servicios:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#404040] mb-2">Información de Registro</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Nombre completo y correo electrónico</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Número de teléfono</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Foto de perfil (opcional)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Información académica o profesional según tu rol</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-[#404040] mb-2">Información de Uso</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Registros de clases reservadas y completadas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Mensajes y comunicaciones en la plataforma</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Grabaciones de clases (con tu consentimiento)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Valoraciones y reseñas</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-[#404040] mb-2">Información de Pago</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Datos de facturación (procesados de forma segura por Stripe)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#404040] mt-1">•</span>
                      <span>Historial de transacciones</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Eye className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">2. Cómo Utilizamos tu Información</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Utilizamos la información recopilada para:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Proporcionar, mantener y mejorar nuestros servicios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Facilitar la conexión entre profesores y alumnos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Procesar pagos y gestionar suscripciones</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Enviarte notificaciones sobre tus clases y mensajes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Mejorar la seguridad y prevenir fraudes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Cumplir con obligaciones legales</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">3. Compartir Información</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                No vendemos tu información personal a terceros. Solo compartimos información en los 
                siguientes casos:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Entre usuarios:</strong> Información de perfil necesaria para la 
                  prestación del servicio (nombre, foto, valoraciones)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Proveedores de servicios:</strong> Como Stripe para procesamiento de 
                  pagos y Google Calendar para sincronización de eventos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Requisitos legales:</strong> Cuando sea requerido por ley o para 
                  proteger nuestros derechos</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Lock className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">4. Seguridad de los Datos</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Cifrado SSL/TLS para todas las transmisiones de datos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Contraseñas cifradas en nuestra base de datos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Acceso restringido a información personal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Monitoreo continuo de seguridad</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">5. Tus Derechos</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Bajo el RGPD (Reglamento General de Protección de Datos), tienes los siguientes derechos:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Acceso:</strong> Solicitar una copia de tus datos personales</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Supresión:</strong> Solicitar la eliminación de tus datos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Portabilidad:</strong> Recibir tus datos en formato estructurado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Oposición:</strong> Oponerte al procesamiento de tus datos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span><strong>Limitación:</strong> Solicitar la restricción del procesamiento</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Database className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">6. Cookies y Tecnologías Similares</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Mantener tu sesión iniciada</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Recordar tus preferencias</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Analizar el uso de la plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Mejorar la experiencia de usuario</span>
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar a la 
                funcionalidad de la plataforma.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">7. Retención de Datos</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Conservamos tu información personal solo durante el tiempo necesario para cumplir con los 
              fines descritos en esta política, salvo que la ley requiera o permita un período de retención 
              más largo. Cuando elimines tu cuenta, borraremos o anonimizaremos tus datos personales.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">8. Cambios a esta Política</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre 
              cambios significativos publicando la nueva política en nuestro sitio web y enviándote un 
              correo electrónico. Te recomendamos revisar esta página periódicamente.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-[#404040] mb-4">Contacto y Ejercicio de Derechos</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              Si tienes preguntas sobre esta Política de Privacidad o deseas ejercer tus derechos, 
              puedes contactarnos en:
            </p>
            <p className="text-[#41f2c0] font-medium">
              <a href="mailto:menttio@menttio.com" className="hover:underline">
                menttio@menttio.com
              </a>
            </p>
            <p className="text-gray-600 text-sm mt-4">
              También puedes gestionar gran parte de tu información personal desde la configuración 
              de tu perfil en la plataforma.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}