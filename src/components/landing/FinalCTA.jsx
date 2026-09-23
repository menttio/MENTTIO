import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

/**
 * La portada terminaba en el pie de página: quien llegaba hasta abajo, que es justo quien
 * más convencido está, no se encontraba nada que pulsar. Este bloque cierra la página
 * pidiendo lo único que queremos que haga, y repite las tres objeciones que la FAQ acaba
 * de resolver para que no tenga que volver a subir a comprobarlas.
 */
export default function FinalCTA() {
  const tranquilizadores = [
    '14 días gratis, sin tarjeta',
    'Cancelas cuando quieras',
    'Tus alumnos no pagan nada',
  ];

  return (
    <section className="bg-gradient-to-br from-[#41f2c0] via-[#35d4a7] to-[#2ab88f] py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto px-6 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Da tu próxima clase con todo resuelto
        </h2>
        <p className="text-lg text-white/90 mb-8">
          Configura tus asignaturas y tu disponibilidad una vez. La videollamada, la grabación,
          los apuntes y el cobro dejan de ser cosa tuya.
        </p>

        <Button
          onClick={() => { window.location.href = createPageUrl('SelectRole'); }}
          size="lg"
          className="bg-[#404040] hover:bg-[#303030] text-white px-8 py-6 text-lg rounded-xl shadow-xl w-full sm:w-auto"
        >
          Empieza gratis 14 días
          <ArrowRight className="ml-2" size={18} />
        </Button>

        <ul className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          {tranquilizadores.map((texto) => (
            <li key={texto} className="flex items-center gap-2 text-white">
              <Check size={18} className="text-[#404040] flex-shrink-0" />
              <span className="text-sm font-medium">{texto}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
