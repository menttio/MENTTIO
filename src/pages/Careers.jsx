import React from 'react';
import { ArrowLeft, Briefcase, MapPin, Clock, ArrowRight, Heart, Zap, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Careers() {
  const positions = [
    {
      id: 1,
      title: 'Full Stack Developer',
      department: 'Ingeniería',
      location: 'Madrid / Remoto',
      type: 'Tiempo completo',
      description: 'Buscamos un desarrollador apasionado para ayudarnos a construir la mejor plataforma educativa.'
    },
    {
      id: 2,
      title: 'Product Manager',
      department: 'Producto',
      location: 'Madrid',
      type: 'Tiempo completo',
      description: 'Lidera la estrategia de producto y ayuda a definir el futuro de Menπio.'
    },
    {
      id: 3,
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Remoto',
      type: 'Tiempo completo',
      description: 'Impulsa nuestra presencia en el mercado y atrae a nuevos usuarios a la plataforma.'
    },
    {
      id: 4,
      title: 'Customer Success Specialist',
      department: 'Soporte',
      location: 'Barcelona / Remoto',
      type: 'Tiempo completo',
      description: 'Ayuda a nuestros usuarios a tener éxito y garantiza una experiencia excepcional.'
    }
  ];

  const values = [
    {
      icon: Heart,
      title: 'Pasión por la educación',
      description: 'Creemos en el poder de la educación para transformar vidas'
    },
    {
      icon: Zap,
      title: 'Innovación constante',
      description: 'Siempre buscamos mejores formas de hacer las cosas'
    },
    {
      icon: Users,
      title: 'Trabajo en equipo',
      description: 'Colaboramos y crecemos juntos como equipo'
    },
    {
      icon: TrendingUp,
      title: 'Crecimiento continuo',
      description: 'Invertimos en el desarrollo profesional de nuestro equipo'
    }
  ];

  const benefits = [
    '💰 Salario competitivo',
    '🏠 Trabajo remoto flexible',
    '📚 Presupuesto para formación',
    '🏥 Seguro médico privado',
    '🌴 25 días de vacaciones',
    '💻 Equipo de última generación',
    '☕ Snacks y bebidas ilimitadas',
    '🎉 Team buildings trimestrales'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
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
          >
            <h1 className="text-5xl font-bold mb-4">
              Únete a Men<span className="text-[#404040]">π</span>io
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Estamos construyendo el futuro de la educación. Únete a nuestro equipo y ayúdanos a transformar la forma en que se aprende.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-[#404040] text-center mb-12">
          Nuestros valores
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#41f2c0]/10 flex items-center justify-center">
                    <value.icon className="text-[#41f2c0]" size={32} />
                  </div>
                  <h3 className="font-semibold text-[#404040] mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#404040] text-center mb-12">
            Beneficios
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-[#41f2c0]/10 to-white p-4 rounded-xl border border-[#41f2c0]/20"
              >
                <p className="text-[#404040] font-medium">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-[#404040] mb-2">
          Posiciones abiertas
        </h2>
        <p className="text-gray-600 mb-8">
          Encuentra tu próximo desafío profesional
        </p>

        <div className="space-y-4">
          {positions.map((position, index) => (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-xl transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
                          <Briefcase className="text-[#41f2c0]" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#404040] group-hover:text-[#41f2c0] transition-colors">
                            {position.title}
                          </h3>
                          <p className="text-sm text-gray-500">{position.department}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{position.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{position.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>{position.type}</span>
                        </div>
                      </div>
                    </div>
                    
                    <ArrowRight 
                      className="text-[#41f2c0] group-hover:translate-x-1 transition-transform mt-2" 
                      size={24} 
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿No encuentras lo que buscas?
          </h2>
          <p className="text-white/90 mb-8">
            Envíanos tu CV y cuéntanos en qué área te gustaría trabajar
          </p>
          <a href="/Contact">
            <Button className="bg-white text-[#41f2c0] hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-xl">
              Enviar CV espontáneo
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}