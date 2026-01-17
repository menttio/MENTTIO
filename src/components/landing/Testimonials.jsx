import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'María García',
    role: 'Estudiante de Bachillerato',
    image: '👩‍🎓',
    rating: 5,
    text: 'Menπio ha cambiado mi forma de estudiar. Puedo reservar clases cuando las necesito y repasar las grabaciones antes de los exámenes. ¡Mis notas han mejorado muchísimo!'
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Profesor de Matemáticas',
    image: '👨‍🏫',
    rating: 5,
    text: 'Como profesor, esta plataforma me ha facilitado todo. Ya no pierdo tiempo gestionando reservas o pagos. Me centro solo en enseñar y mis alumnos están más contentos que nunca.'
  },
  {
    name: 'Laura Martínez',
    role: 'Madre de alumno',
    image: '👩‍💼',
    rating: 5,
    text: 'Increíble poder hacer seguimiento de las clases de mi hijo. La transparencia en pagos y la facilidad de comunicación con los profesores me dan mucha tranquilidad.'
  },
  {
    name: 'David López',
    role: 'Estudiante Universitario',
    image: '👨‍💻',
    rating: 5,
    text: 'Necesitaba clases de programación y encontré al profesor perfecto en minutos. El sistema de reservas es super intuitivo y tener todo grabado es un plus enorme.'
  },
  {
    name: 'Ana Fernández',
    role: 'Profesora de Inglés',
    image: '👩‍🏫',
    rating: 5,
    text: 'Empecé con el mes gratis y me quedé. La plataforma es profesional, fácil de usar y me ha ayudado a conseguir muchos más alumnos. Totalmente recomendable.'
  },
  {
    name: 'Jorge Sánchez',
    role: 'Estudiante de ESO',
    image: '🧑‍🎓',
    rating: 5,
    text: 'Antes me costaba mucho pedir ayuda. Con Menπio es super fácil encontrar profesores y reservar clases. Además puedo chatear con ellos cuando tengo dudas rápidas.'
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
          <h2 className="text-4xl lg:text-5xl font-bold text-[#404040] mb-4">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Miles de alumnos y profesores ya confían en Menπio
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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