import React from 'react';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

const testimonials = [
  {
    name: 'Laura Gómez',
    role: 'Profesora particular',
    subject: 'Matemáticas y Física',
    type: 'teacher',
    rating: 5,
    text: 'Antes organizaba mis clases por WhatsApp y era un caos. Ahora tengo todo centralizado y no pierdo tiempo gestionando horarios. Mis alumnos reservan solos.'
  },
  {
    name: 'David Ruiz',
    role: 'Profesor de Bachillerato',
    subject: 'Matemáticas',
    type: 'teacher',
    rating: 5,
    text: 'La plataforma me ha permitido organizar mejor a mis alumnos y dar una imagen mucho más profesional. Todo está en un solo lugar.'
  },
  {
    name: 'Marta López',
    role: 'Profesora online',
    subject: 'Inglés',
    type: 'teacher',
    rating: 5,
    text: 'Lo mejor es tener agenda, pagos y materiales en la misma plataforma. Me ahorra muchísimo tiempo cada semana.'
  },
  {
    name: 'Carlos Sánchez',
    role: 'Alumno · Selectividad',
    subject: 'Preparación EBAU',
    type: 'student',
    rating: 5,
    text: 'Las clases me han ayudado mucho para prepararme la selectividad. Reservar es rapidísimo y puedo repasar las grabaciones antes del examen.'
  },
  {
    name: 'Sofía Martínez',
    role: 'Alumna · 4º ESO',
    subject: 'Matemáticas',
    type: 'student',
    rating: 5,
    text: 'Me gusta poder acceder a los materiales y las grabaciones cuando quiero. No tengo que pedirle nada al profesor, está todo disponible desde el móvil.'
  },
  {
    name: 'Iván Torres',
    role: 'Alumno · 1º Bachillerato',
    subject: 'Física y Química',
    type: 'student',
    rating: 5,
    text: 'Empecé con clases de Física porque iba muy mal. La plataforma hace que todo sea fácil: reservas, materiales y dudas con el profesor en el mismo sitio.'
  }
];

function Avatar({ name }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('');
  return (
    <div className="w-14 h-14 bg-gradient-to-br from-[#41f2c0] to-[#2ab88f] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  );
}

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
            Lo que dicen profesores y alumnos
          </h2>
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
              <Quote className="absolute top-6 right-6 text-[#41f2c0]/45" size={36} />

              <div className="flex items-center gap-4 mb-4">
                <Avatar name={testimonial.name} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-semibold text-[#404040]">{testimonial.name}</h4>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      testimonial.type === 'teacher'
                        ? 'bg-[#41f2c0]/15 text-[#2ab88f]'
                        : 'bg-[#404040]/10 text-[#404040]'
                    }`}>
                      {testimonial.type === 'teacher' ? 'Profesor' : 'Alumno'}
                    </span>
                  </div>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <p className="text-gray-500 mb-5">Únete a los profesores que ya gestionan sus clases sin caos</p>
          <Button
            onClick={() => window.location.href = createPageUrl('TeacherSignup')}
            size="lg"
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
          >
            Crea tu perfil gratis
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
