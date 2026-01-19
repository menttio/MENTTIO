import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Video, Calendar, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function Hero() {
  const handleGetStarted = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#41f2c0] via-[#35d4a7] to-[#2ab88f] min-h-screen flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-60 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-20 right-1/3 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-[#41f2c0]">π</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Men<span className="text-[#404040]">π</span>io</h1>
          </div>
          <Button 
            onClick={handleGetStarted}
            variant="outline" 
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white hover:text-[#41f2c0] transition-all"
          >
            Iniciar Sesión
          </Button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="text-white" size={16} />
              <span className="text-white text-sm font-medium">La revolución de las clases particulares</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Tu plataforma de clases
              <span className="block text-[#404040]">todo en uno</span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Conecta con profesores expertos, gestiona tus clases, accede a grabaciones y materiales. 
              Todo automatizado en una sola plataforma.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-[#404040] hover:bg-[#303030] text-white px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all"
              >
                Comenzar gratis
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg" 
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white hover:text-[#41f2c0] px-8 py-6 text-lg rounded-xl"
              >
                Ver precios
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">1000+</div>
                <div className="text-sm text-white/80">Clases impartidas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">500+</div>
                <div className="text-sm text-white/80">Alumnos activos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">200+</div>
                <div className="text-sm text-white/80">Profesores</div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative">
              {/* Main card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#41f2c0] rounded-xl flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#404040]">Próxima clase</div>
                    <div className="text-sm text-gray-500">Matemáticas · 16:00</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Users className="text-[#41f2c0]" size={20} />
                    <span className="text-sm text-gray-600">Con Prof. García</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Video className="text-[#41f2c0]" size={20} />
                    <span className="text-sm text-gray-600">Grabación disponible</span>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-lg p-4 z-20"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">En línea ahora</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-[#404040] text-white rounded-2xl shadow-lg p-4 z-20"
              >
                <div className="text-2xl font-bold">95%</div>
                <div className="text-xs opacity-90">Satisfacción</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}