import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Star, Video, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TEACHERS = [
  {
    name: 'Raul Navamuel',
    bio: 'Ingeniería Aeroespacial. Máster en Cálculo Estructural Avanzado.',
    photo: 'https://base44.app/api/apps/694471e9c204eb0088437b85/files/public/694471e9c204eb0088437b85/020e096ff_1739194205004.jpg',
    subjects: [
      { name: 'Matemáticas', level: 'ESO', price: 20 },
      { name: 'Matemáticas', level: 'Bachillerato', price: 20 },
    ],
    rating: 5.0,
    totalClasses: 320,
    hasRecording: true,
  },
  {
    name: 'Alba Villardon',
    bio: 'Ingeniera química especializada en preparación de selectividad y apoyo escolar.',
    photo: null,
    subjects: [
      { name: 'Química', level: 'ESO', price: 20 },
      { name: 'Química', level: 'Bachillerato', price: 20 },
    ],
    rating: 5.0,
    totalClasses: 6,
    hasRecording: false,
  },
  {
    name: 'Raju Tapaa',
    bio: 'Profesor con título TESOL de Londres y MBA. Inglés nativo y académico.',
    photo: null,
    subjects: [
      { name: 'Inglés', level: 'ESO', price: 15 },
    ],
    rating: 5.0,
    totalClasses: 15,
    hasRecording: false,
  },
  {
    name: 'David Owolewa',
    bio: 'Profesor de inglés con experiencia en todos los niveles educativos.',
    photo: null,
    subjects: [
      { name: 'Inglés', level: 'Bachillerato', price: 20 },
      { name: 'Inglés', level: 'Universidad', price: 20 },
    ],
    rating: 5.0,
    totalClasses: 3,
    hasRecording: false,
  },
];

function TeacherCard({ teacher, idx }) {
  const minPrice = Math.min(...teacher.subjects.map(s => s.price));
  const maxPrice = Math.max(...teacher.subjects.map(s => s.price));
  const priceDisplay = minPrice === maxPrice ? `${minPrice}€` : `${minPrice}–${maxPrice}€`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {teacher.photo ? (
            <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
          ) : (
            <User className="text-white" size={24} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#404040] truncate">{teacher.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Star className="text-yellow-400 fill-yellow-400" size={13} />
            <span className="text-sm font-medium text-[#404040]">{teacher.rating.toFixed(1)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{teacher.totalClasses} clases</span>
          </div>
        </div>
      </div>

      {/* Recording badge */}
      {teacher.hasRecording ? (
        <Badge className="w-fit mb-3 bg-green-100 text-green-700 border border-green-200 gap-1">
          <Video size={12} />
          Grabación disponible
        </Badge>
      ) : (
        <Badge variant="outline" className="w-fit mb-3 bg-gray-50 text-gray-400 border-gray-200 gap-1">
          <Video size={12} className="opacity-50" />
          Sin grabación
        </Badge>
      )}

      {/* Bio */}
      <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{teacher.bio}</p>

      {/* Subjects */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {teacher.subjects.slice(0, 3).map((s, i) => (
          <span key={i} className="text-xs bg-[#41f2c0]/10 text-[#404040] px-2 py-1 rounded-full">
            {s.name} <span className="opacity-60">({s.level})</span>
          </span>
        ))}
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <span className="text-xl font-bold text-[#404040]">{priceDisplay}</span>
          <span className="text-sm text-gray-400"> /hora</span>
        </div>
        <Link to={createPageUrl('StudentSignup')}>
          <Button size="sm" className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white">
            Reservar
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

export default function PublicTeachersSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-[#41f2c0]/10 text-[#2ab88f] text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Profesores disponibles
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#404040] mb-4">
            Conoce a nuestros profesores
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Cada profesor fija su precio y disponibilidad. Tú eliges el que mejor se adapta a ti.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEACHERS.map((teacher, idx) => (
            <TeacherCard key={idx} teacher={teacher} idx={idx} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link to={createPageUrl('StudentSignup')}>
            <Button variant="outline" className="border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white px-8">
              Registrarse para ver todos los profesores
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
