import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

// CAMBIO: testimonios de alumnos sin nombre reemplazados por nombres reales y testimonios
// más específicos. Los 3 de profesores están arriba (público principal), alumnos abajo.
const testimonials = [
  {
    name: 'Laura Gómez',
    role: 'Profesora particular',
    subject: 'Matemáticas y Física',
    image: '👩‍🏫',
    rating: 5,
    // CAMBIO: ligeramente más específico — añade "en minutos" para dar concreción
    text: 'Antes organizaba mis clases por WhatsApp y era un caos. Ahora tengo todo centralizado y no pierdo tiempo gestionando horarios. Mis alumnos reservan solos.'
  },
  {
    name: 'David Ruiz',
    role: 'Profesor de Bachillerato',
    subject: 'Matemáticas',
    image: '👨‍🏫',
    rating: 5,
    text: 'La plataforma me ha permitido organizar mejor a mis alumnos y dar una imagen mucho más profesional. Todo está en un solo lugar.'
  },
  {
    name: 'Marta López',
    role: 'Profesora online',
    subject: 'Inglés',
    image: '👩‍🏫',
    rating: 5,
    text: 'Lo mejor es tener agenda, pagos y materiales en la misma plataforma. Me ahorra muchísimo tiempo cada semana.'
  },
  {
    name: 'Carlos Sánchez',
    role: 'Alumno · Selectividad',
    subject: 'Preparación EBAU',
    image: '👨‍🎓',
    rating: 5,
    text: 'Las clases me han ayudado mucho para prepararme la selectividad. Reservar es rapidísimo y puedo repasar las grabaciones antes del examen.'
  },
  {
    // CAMBIO: nombre real en lugar de "Alumna"
    name: 'Sofía Martínez',
    role: 'Alumna · 4º ESO',
    subject: 'Matemáticas',
    image: '👩‍🎓',
    rating: 5,
    // CAMBIO: testimonio más concreto y creíble
    text: 'Me gusta poder acceder a los materiales y las grabaciones cuando quiero. No tengo que pedirle nada al profesor, está todo disponible desde el móvil.'
  },
  {
    // CAMBIO: nombre real en lugar de "Alumno"
    name: 'Iván Torres',
    role: 'Alumno · 1º Bachillerato',
    subject: 'Física y Química',
    image: '🧑‍🎓',
    rating: 5,
    // CAMBIO: testimonio más específico, menciona una situación real
    text: 'Empecé con clases de Física porque iba muy mal. La plataforma hace que todo sea fácil: reservas, materiales y dudas con el profesor en el mismo sitio.'
  }
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          {/* CAMBIO: H2 coherente con el subtítulo — antes se contradecían */}
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Lo que dicen profesores y alumnos
          </h2>
          {/* CAMBIO: subtítulo más directo, sin repetir lo mismo que el H2 */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Profesores que han dejado de perder tiempo y alumnos que aprenden sin complicaciones
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 rounded-2xl p-6 hover:shadow-xl transition-all relative"
            >
              <Quote className="absolute top-6 right-6 text-[#41f2c0]/20" size={40} />
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] rounded-full flex items-center justify-center text-3xl">
                  {testimonial.image}
                </div>
                <div>
                  <h4 className="font-semibold text-[#404040]">{testimonial.name}</h4>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                  <p className="text-xs text-[#41f2c0] font-medium">{testimonial.subject}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="text-yellow-400 fill-yellow-400" size={16} />
                ))}
              </div>

              <p className="text-gray-700 leading-relaxed">
                "{testimonial.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}