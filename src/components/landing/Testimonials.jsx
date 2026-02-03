import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Carlos Sanchez',
    role: '18 años',
    subject: 'Preparación Selectividad',
    image: '👨‍🎓',
    rating: 5,
    text: 'Las clases han sido de gran ayuda para prepararme para la prueba de acceso a la universidad. ¡Muy recomendable!.'
  },
  {
    name: 'Alumna',
    role: '14 años',
    subject: 'Matemáticas ESO',
    image: '👩‍🎓',
    rating: 5,
    text: 'Las clases son muy buenas, me han ayudado mucho y me siento más segura con el contenido. Estoy muy contenta con la forma en que se explican los temas, todo es claro y fácil de entender.'
  },
  {
    name: 'Alonso Martín',
    role: '14 años',
    subject: 'Matemáticas ESO',
    image: '👨‍🎓',
    rating: 5,
    text: 'Las clases han sido muy satisfactorias y me han ayudado muchísimo a mejorar y aprobar mis exámenes'
  },
  {
    name: 'Alumna',
    role: '18 años',
    subject: 'Preparación Selectividad',
    image: '👩‍🎓',
    rating: 5,
    text: 'Gracias a las clases, llegué mucho más preparado para la prueba de acceso a la universidad. Las explicaciones fueron claras y me ayudaron a entender todo mejor..'
  },
  {
    name: 'Alumno',
    role: '17 años',
    subject: 'Matemáticas / Física / Química Bachillerato',
    image: '🧑‍🎓',
    rating: 5,
    text: 'Las clases me parecen muy útiles, especialmente para aclarar conceptos que no tenía del todo claros.'
  },
  {
    name: 'Alumno',
    role: '17 años',
    subject: 'Matemáticas / Física y química / Tecnología / Inglés BACH',
    image: '👨‍🎓',
    rating: 5,
    text: 'Explica muy bien, de manera muy amena, fácil de entender e intuitiva, además es un profesor muy cercano a sus alumnos dispuesto a ayudar cuando sea necesario.'
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