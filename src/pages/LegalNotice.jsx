import React from 'react';
import { ArrowLeft, Scale, Building, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LegalNotice() {
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
              <Scale size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Aviso Legal</h1>
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
          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Building className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">1. Datos Identificativos</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600">
                En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la 
                Sociedad de la Información y de Comercio Electrónico, se exponen los siguientes datos:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Building className="text-[#41f2c0] mt-1" size={18} />
                  <div>
                    <p className="font-semibold text-[#404040]">Denominación social:</p>
                    <p className="text-gray-600">Menπio S.L.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-[#41f2c0] mt-1" size={18} />
                  <div>
                    <p className="font-semibold text-[#404040]">Domicilio social:</p>
                    <p className="text-gray-600">Calle Innovación 123, 28001 Madrid, España</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="text-[#41f2c0] mt-1" size={18} />
                  <div>
                    <p className="font-semibold text-[#404040]">Email de contacto:</p>
                    <p className="text-gray-600">menttio@menttio.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="text-[#41f2c0] mt-1" size={18} />
                  <div>
                    <p className="font-semibold text-[#404040]">CIF:</p>
                    <p className="text-gray-600">B-12345678</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">2. Objeto y Ámbito de Aplicación</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                El presente Aviso Legal regula el uso del sitio web www.menttio.com (en adelante, 
                "el Sitio Web") del que es titular Menπio S.L.
              </p>
              <p className="text-gray-600 leading-relaxed">
                La navegación por el Sitio Web atribuye la condición de usuario del mismo e implica la 
                aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en 
                este Aviso Legal.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">3. Condiciones de Uso</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                El acceso y uso del Sitio Web es gratuito, salvo en lo relativo al coste de la conexión 
                a través de la red de telecomunicaciones suministrada por el proveedor de acceso 
                contratado por los usuarios.
              </p>
              <p className="text-gray-600 leading-relaxed">
                El usuario se compromete a hacer un uso adecuado de los contenidos y servicios que 
                Menπio ofrece a través de su Sitio Web y a no emplearlos para:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Incurrir en actividades ilícitas, ilegales o contrarias a la buena fe y al orden público</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Difundir contenidos o propaganda de carácter racista, xenófobo, pornográfico-ilegal, de apología del terrorismo o atentatorio contra los derechos humanos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Provocar daños en los sistemas físicos y lógicos de Menπio, de sus proveedores o de terceras personas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✕</span>
                  <span>Introducir o difundir en la red virus informáticos o cualesquiera otros sistemas físicos o lógicos que sean susceptibles de provocar los daños anteriormente mencionados</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">4. Propiedad Intelectual e Industrial</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Menπio es titular de todos los derechos de propiedad intelectual e industrial del Sitio 
                Web, así como de los elementos contenidos en el mismo (a título enunciativo, imágenes, 
                sonido, audio, vídeo, software o textos; marcas o logotipos, combinaciones de colores, 
                estructura y diseño, selección de materiales usados, programas de ordenador necesarios 
                para su funcionamiento, acceso y uso, etc.).
              </p>
              <p className="text-gray-600 leading-relaxed">
                Todos los derechos reservados. En virtud de lo dispuesto en los artículos 8 y 32.1, 
                párrafo segundo, de la Ley de Propiedad Intelectual, quedan expresamente prohibidas la 
                reproducción, la distribución y la comunicación pública, incluida su modalidad de puesta 
                a disposición, de la totalidad o parte de los contenidos de esta página web, con fines 
                comerciales, en cualquier soporte y por cualquier medio técnico, sin la autorización de 
                Menπio.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">5. Exclusión de Garantías y Responsabilidad</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Menπio no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier 
                naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los 
                contenidos, falta de disponibilidad del portal o la transmisión de virus o programas 
                maliciosos o lesivos en los contenidos, a pesar de haber adoptado todas las medidas 
                tecnológicas necesarias para evitarlo.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">6. Enlaces</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                En el caso de que en el Sitio Web se dispusiesen enlaces o hipervínculos hacia otros 
                sitios de Internet, Menπio no ejercerá ningún tipo de control sobre dichos sitios y 
                contenidos. En ningún caso Menπio asumirá responsabilidad alguna por los contenidos de 
                algún enlace perteneciente a un sitio web ajeno.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">7. Modificaciones</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                Menπio se reserva el derecho de efectuar sin previo aviso las modificaciones que 
                considere oportunas en su portal, pudiendo cambiar, suprimir o añadir tanto los 
                contenidos y servicios que se presten a través de la misma como la forma en la que 
                éstos aparezcan presentados o localizados en su portal.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#41f2c0]/10 rounded-lg flex items-center justify-center">
                <Scale className="text-[#41f2c0]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#404040]">8. Legislación Aplicable y Jurisdicción</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-gray-600 leading-relaxed">
                La relación entre Menπio y el usuario se regirá por la normativa española vigente y 
                cualquier controversia se someterá a los Juzgados y Tribunales de la ciudad de Madrid.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-[#404040] mb-4">Contacto</h3>
            <p className="text-gray-600 leading-relaxed">
              Para cualquier consulta relacionada con este Aviso Legal, puede contactar con nosotros 
              a través de:
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