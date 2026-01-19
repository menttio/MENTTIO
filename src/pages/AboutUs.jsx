import React from 'react';
import { ArrowLeft, Target, Heart, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <a href="/Home">
            <Button variant="ghost" className="text-gray-500 hover:text-[#404040]">
              <ArrowLeft size={18} className="mr-2" />
              Volver
            </Button>
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl lg:text-6xl font-bold text-[#404040] mb-6">
            Sobre <span className="text-[#41f2c0]">Men<span className="text-[#404040]">π</span>io</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Estamos transformando la forma en que profesores y alumnos se conectan, 
            haciendo que la educación personalizada sea accesible para todos.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl p-12 mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#41f2c0]/10 rounded-2xl flex items-center justify-center">
              <Target className="text-[#41f2c0]" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-[#404040]">Nuestra Misión</h2>
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            Creemos que cada estudiante merece acceso a educación de calidad y personalizada. 
            Nuestra plataforma conecta a profesores apasionados con alumnos motivados, 
            proporcionando todas las herramientas necesarias para que el proceso de enseñanza 
            y aprendizaje sea simple, eficiente y efectivo.
          </p>
        </motion.div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Heart className="text-blue-500" size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#404040] mb-3">Pasión por la educación</h3>
            <p className="text-gray-600">
              Nos apasiona facilitar el acceso a la educación de calidad para todos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="w-14 h-14 bg-[#41f2c0]/10 rounded-xl flex items-center justify-center mb-6">
              <Zap className="text-[#41f2c0]" size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#404040] mb-3">Innovación constante</h3>
            <p className="text-gray-600">
              Desarrollamos tecnología que simplifica y mejora la experiencia educativa.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <Users className="text-purple-500" size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#404040] mb-3">Comunidad primero</h3>
            <p className="text-gray-600">
              Construimos una comunidad de profesores y alumnos que se apoyan mutuamente.
            </p>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] rounded-3xl shadow-2xl p-12"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Menπio en números
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-white mb-2">500+</div>
              <div className="text-white/80 text-lg">Profesores activos</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">2,000+</div>
              <div className="text-white/80 text-lg">Alumnos registrados</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">10,000+</div>
              <div className="text-white/80 text-lg">Clases impartidas</div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-16"
        >
          <h2 className="text-3xl font-bold text-[#404040] mb-4">
            ¿Listo para ser parte de Menπio?
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Únete a nuestra comunidad y descubre una nueva forma de enseñar y aprender
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/SelectRole?role=student">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-xl">
                Soy Alumno
              </Button>
            </a>
            <a href="/TeacherSignup">
              <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white px-8 py-6 text-lg rounded-xl">
                Soy Profesor
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}