import React from 'react';
import { ArrowLeft, FileText, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function TermsOfService() {
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
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Términos de Uso</h1>
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
            <h2 className="text-2xl font-bold text-[#404040] mb-4">Bienvenido a Menπio</h2>
            <p className="text-gray-600 leading-relaxed">
              Estos Términos de Uso rigen el acceso y uso de la plataforma Menπio. Al registrarte y utilizar 
              nuestros servicios, aceptas estos términos en su totalidad. Por favor, léelos cuidadosamente.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">1. Aceptación de los Términos</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Al crear una cuenta en Menπio, confirmas que tienes al menos 18 años o cuentas con el 
              consentimiento de tus padres o tutores legales. Te comprometes a proporcionar información 
              veraz y actualizada durante el registro.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">2. Descripción del Servicio</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Menπio es una plataforma que conecta profesores con alumnos para la impartición de clases 
                particulares online. Proporcionamos:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Sistema de gestión de reservas y calendario</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Herramientas de comunicación entre profesores y alumnos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Almacenamiento y acceso a grabaciones de clases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#41f2c0] mt-1">•</span>
                  <span>Procesamiento de pagos entre alumnos y profesores</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">3. Cuentas de Usuario</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                <strong>Para Alumnos:</strong> El registro y uso de la plataforma es gratuito. Solo pagarás 
                por las clases que reserves con los profesores.
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Para Profesores:</strong> La suscripción tiene un coste de 20€ al mes, con el primer 
                mes completamente gratis. Eres responsable de mantener tu perfil actualizado y de cumplir con 
                las clases programadas.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades 
                que ocurran bajo tu cuenta.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">4. Pagos y Tarifas</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Los pagos entre alumnos y profesores se procesan de forma segura a través de nuestra 
                plataforma. Menπio no cobra comisiones por las clases. Los profesores establecen sus 
                propias tarifas.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Las cancelaciones deben realizarse con al menos 24 horas de antelación para obtener un 
                reembolso completo.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">5. Conducta del Usuario</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Te comprometes a utilizar Menπio de manera responsable y ética. Está prohibido:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Publicar contenido ofensivo, discriminatorio o inapropiado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Suplantar la identidad de otra persona</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Intentar acceder a cuentas de otros usuarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Utilizar la plataforma para actividades ilegales</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">6. Propiedad Intelectual</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Todo el contenido de la plataforma Menπio, incluyendo diseño, logotipos, textos y software, 
              está protegido por derechos de autor y otras leyes de propiedad intelectual. Las grabaciones 
              de clases y materiales son propiedad de sus respectivos creadores.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">7. Limitación de Responsabilidad</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Menπio actúa como intermediario entre profesores y alumnos. No somos responsables de la 
              calidad de las clases, ni de las disputas que puedan surgir entre usuarios. Sin embargo, 
              nos esforzamos por proporcionar un servicio de calidad y mediar en caso de conflictos.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">8. Modificaciones</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos 
              sobre cambios importantes por correo electrónico. El uso continuado de la plataforma después 
              de las modificaciones constituye tu aceptación de los nuevos términos.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">9. Terminación</h3>
            </div>
            <p className="text-gray-600 leading-relaxed ml-11">
              Puedes cancelar tu cuenta en cualquier momento desde la configuración de tu perfil. Nos 
              reservamos el derecho de suspender o cancelar cuentas que violen estos términos o realicen 
              actividades fraudulentas.
            </p>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-[#404040] mb-4">Contacto</h3>
            <p className="text-gray-600 leading-relaxed">
              Si tienes preguntas sobre estos Términos de Uso, puedes contactarnos en:
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