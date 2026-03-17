import React from 'react';
import { ArrowLeft, Cookie, Settings, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function CookiesPolicy() {
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
              <Cookie size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Política de Cookies</h1>
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
            <h2 className="text-2xl font-bold text-[#404040] mb-4">¿Qué son las cookies?</h2>
            <p className="text-gray-600 leading-relaxed">
              Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo 
              cuando los visitas. Se utilizan ampliamente para hacer que los sitios web funcionen de 
              manera más eficiente y para proporcionar información a los propietarios del sitio.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Cookie className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">1. Cookies que Utilizamos</h3>
            </div>
            <div className="ml-11 space-y-4">
              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies Esenciales</h4>
                <p className="text-gray-600 mb-2">
                  Estas cookies son necesarias para el funcionamiento básico del sitio web y no pueden 
                  ser desactivadas.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Autenticación:</strong> Mantienen tu sesión iniciada mientras navegas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Seguridad:</strong> Protegen contra ataques y fraudes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Preferencias:</strong> Recuerdan tu idioma y configuración regional</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies de Funcionalidad</h4>
                <p className="text-gray-600 mb-2">
                  Permiten que el sitio web recuerde tus elecciones y proporcione características mejoradas.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Preferencias de usuario:</strong> Configuraciones personalizadas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Tours completados:</strong> Recordar qué tutoriales has visto</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Notificaciones:</strong> Gestión de permisos de notificaciones push</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies de Análisis</h4>
                <p className="text-gray-600 mb-2">
                  Nos ayudan a entender cómo los usuarios interactúan con el sitio web.
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Estadísticas de uso:</strong> Páginas visitadas y tiempo de navegación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Mejora del servicio:</strong> Identificar problemas y áreas de mejora</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies de Terceros</h4>
                <p className="text-gray-600 mb-2">
                  Servicios externos que utilizamos en nuestra plataforma:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Stripe:</strong> Procesamiento seguro de pagos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#41f2c0] mt-1">•</span>
                    <span><strong>Google Calendar:</strong> Sincronización de eventos</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Eye className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">2. Duración de las Cookies</h3>
            </div>
            <div className="ml-11 space-y-3">
              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies de Sesión</h4>
                <p className="text-gray-600">
                  Se eliminan automáticamente cuando cierras el navegador. Se utilizan para mantener 
                  tu sesión activa mientras navegas.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#404040] mb-2">Cookies Persistentes</h4>
                <p className="text-gray-600">
                  Permanecen en tu dispositivo durante un período determinado (generalmente entre 1 mes 
                  y 1 año). Se utilizan para recordar tus preferencias entre visitas.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Settings className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">3. Cómo Gestionar las Cookies</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Puedes controlar y gestionar las cookies de varias formas:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#404040] mb-2">Configuración del Navegador</h4>
                  <p className="text-gray-600 mb-2">
                    Todos los navegadores permiten gestionar cookies. Puedes configurar tu navegador para:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <span>Bloquear todas las cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <span>Aceptar solo cookies de primera parte</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <span>Eliminar cookies al cerrar el navegador</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Importante:</strong> Si bloqueas o eliminas las cookies esenciales, 
                    algunas funciones del sitio web pueden no funcionar correctamente, como mantener 
                    tu sesión iniciada o recordar tus preferencias.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-[#404040] mb-2">Enlaces a Configuración de Navegadores</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#41f2c0] hover:underline">
                        Google Chrome
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer" className="text-[#41f2c0] hover:underline">
                        Mozilla Firefox
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#41f2c0] hover:underline">
                        Safari
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#41f2c0] mt-1">•</span>
                      <a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies" target="_blank" rel="noopener noreferrer" className="text-[#41f2c0] hover:underline">
                        Microsoft Edge
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Cookie className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">4. Actualizaciones de esta Política</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Podemos actualizar esta Política de Cookies de vez en cuando para reflejar cambios en 
              las cookies que utilizamos o por otras razones operativas, legales o reglamentarias. 
              Te recomendamos revisar esta página periódicamente.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-[#404040] mb-4">¿Tienes preguntas?</h3>
            <p className="text-gray-600 leading-relaxed">
              Si tienes preguntas sobre nuestra Política de Cookies, puedes contactarnos en:
            </p>
            <p className="text-[#41f2c0] font-medium mt-2">
              <a href="mailto:menttio@menttio.com" className="hover:underline">
                menttio@menttio.com
              </a>
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}