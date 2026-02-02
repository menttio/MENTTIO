import React from 'react';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Blog() {
  const articles = [
    {
      id: 1,
      title: '5 Consejos para aprobar tus exámenes finales',
      excerpt: 'Descubre las mejores estrategias de estudio que realmente funcionan para preparar tus exámenes con éxito.',
      date: '15 Enero 2026',
      readTime: '5 min',
      category: 'Estudiantes',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Cómo ser un profesor más efectivo online',
      excerpt: 'Técnicas y herramientas para mejorar tus clases virtuales y mantener a tus alumnos motivados.',
      date: '10 Enero 2026',
      readTime: '7 min',
      category: 'Profesores',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop'
    },
    {
      id: 3,
      title: 'La revolución de las clases particulares digitales',
      excerpt: 'Cómo la tecnología está transformando la educación personalizada y las oportunidades que ofrece.',
      date: '5 Enero 2026',
      readTime: '6 min',
      category: 'Tendencias',
      image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop'
    },
    {
      id: 4,
      title: 'Gestión del tiempo: Organiza tu calendario de estudio',
      excerpt: 'Aprende a planificar tu tiempo de estudio de manera efectiva para maximizar tu productividad.',
      date: '28 Diciembre 2025',
      readTime: '4 min',
      category: 'Estudiantes',
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&auto=format&fit=crop'
    },
    {
      id: 5,
      title: 'Fija tus precios como profesor particular',
      excerpt: 'Guía completa para establecer tarifas competitivas y justas por tus servicios educativos.',
      date: '20 Diciembre 2025',
      readTime: '8 min',
      category: 'Profesores',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop'
    },
    {
      id: 6,
      title: 'Herramientas digitales para el aprendizaje',
      excerpt: 'Las mejores apps y plataformas que todo estudiante debería conocer en 2026.',
      date: '15 Diciembre 2025',
      readTime: '5 min',
      category: 'Tendencias',
      image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&auto=format&fit=crop'
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      'Estudiantes': 'bg-blue-100 text-blue-700',
      'Profesores': 'bg-purple-100 text-purple-700',
      'Tendencias': 'bg-green-100 text-green-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

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
            <h1 className="text-5xl font-bold mb-4">Blog de Men<span className="text-[#404040]">π</span>io</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Consejos, guías y noticias sobre educación, clases particulares y aprendizaje online
            </p>
          </motion.div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <div className="relative overflow-hidden h-48">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </span>
                  </div>
                </div>
                
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{article.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#404040] mb-3 group-hover:text-[#41f2c0] transition-colors">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 flex-1">
                    {article.excerpt}
                  </p>
                  
                  <div className="flex items-center text-[#41f2c0] font-medium group-hover:gap-2 transition-all">
                    Leer más
                    <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-[#41f2c0] to-[#35d4a7] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Suscríbete a nuestro newsletter
          </h2>
          <p className="text-sm md:text-base text-white/90 mb-8">
            Recibe los mejores consejos y novedades directamente en tu correo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="tu@email.com"
              className="flex-1 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-white"
            />
            <Button className="bg-[#404040] hover:bg-[#303030] text-white px-8 rounded-xl w-full sm:w-auto">
              Suscribirse
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}