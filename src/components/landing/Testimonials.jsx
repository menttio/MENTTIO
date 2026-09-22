import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Quote, Star, Users, CalendarCheck, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';

/**
 * Antes esta sección mostraba testimonios inventados. Ahora enseña solo lo que se puede
 * comprobar: las valoraciones reales que han dejado los alumnos. Mientras no haya ninguna,
 * se dice abiertamente que la plataforma está empezando, que es verdad y además funciona
 * mejor como argumento ("sé de los primeros") que un testimonio falso.
 */
export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const lista = await base44.entities.Review.list('-created_date', 6);
        if (!cancelado) setReviews((lista || []).filter((r) => r.comment && r.comment.trim().length > 20));
      } catch (_e) {
        if (!cancelado) setReviews([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) return null;

  if (reviews.length === 0) {
    return (
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-[#41f2c0]/10 px-4 py-1.5 text-sm font-medium text-[#2ab88f]">
              <Sparkles size={16} />
              Estamos empezando
            </span>
            <h2 className="mt-4 text-4xl lg:text-5xl font-bold text-[#404040]">
              Todavía no tenemos opiniones que enseñarte
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Menttio es nuevo y preferimos decirlo a inventarnos reseñas. Esto es lo que sí podemos
              contarte, y es real:
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: CalendarCheck, dato: '+100', texto: 'clases gestionadas en la plataforma' },
              { icon: Users, dato: '20+', texto: 'alumnos usándola cada semana' },
              { icon: Star, dato: '0 €', texto: 'para los alumnos: pagan solo sus clases' },
            ].map((item) => (
              <div key={item.texto} className="rounded-2xl bg-gray-50 p-6 text-center">
                <item.icon className="mx-auto text-[#41f2c0]" size={28} />
                <p className="mt-3 text-3xl font-bold text-[#404040]">{item.dato}</p>
                <p className="mt-1 text-sm text-gray-600">{item.texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-[#41f2c0]/40 bg-[#41f2c0]/5 p-8 text-center">
            <p className="text-lg text-[#404040]">
              Cuando los primeros profesores y alumnos valoren sus clases, sus opiniones aparecerán
              aquí tal cual las escriban.
            </p>
            <Link
              to={createPageUrl('SelectRole')}
              className="mt-5 inline-block rounded-xl bg-[#41f2c0] px-6 py-3 font-medium text-white transition-colors hover:bg-[#35d4a7]"
            >
              Probar Menttio
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Lo que dicen los alumnos
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Valoraciones reales escritas por alumnos después de sus clases
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id || index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 rounded-2xl p-6 hover:shadow-xl transition-all relative"
            >
              <Quote className="absolute top-6 right-6 text-[#41f2c0]/45" size={36} />
              <div className="flex gap-1 mb-4">
                {[...Array(Math.round(review.rating || 0))].map((_, i) => (
                  <Star key={i} size={16} className="fill-[#41f2c0] text-[#41f2c0]" />
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed">“{review.comment}”</p>
              <p className="mt-4 text-sm font-semibold text-[#404040]">
                {review.student_name || 'Alumno'}
                {review.teacher_name ? ` · clase con ${review.teacher_name}` : ''}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
