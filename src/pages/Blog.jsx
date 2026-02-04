import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function Blog() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const articles = [
    {
      id: 1,
      title: '5 Consejos para aprobar tus exámenes finales',
      excerpt: 'Descubre las mejores estrategias de estudio que realmente funcionan para preparar tus exámenes con éxito.',
      content: `
        <h2>Planifica con anticipación</h2>
        <p>La clave del éxito en los exámenes es la planificación. Comienza a estudiar al menos 2-3 semanas antes del examen. Divide el temario en secciones manejables y establece metas diarias realistas.</p>
        
        <h2>Técnica Pomodoro</h2>
        <p>Estudia en bloques de 25 minutos con descansos de 5 minutos. Esta técnica mejora la concentración y previene el agotamiento mental. Después de 4 bloques, toma un descanso más largo de 15-30 minutos.</p>
        
        <h2>Práctica activa</h2>
        <p>No te limites a leer. Haz resúmenes, esquemas, mapas mentales y flashcards. Enseña el contenido a otra persona o explícalo en voz alta. La práctica activa mejora significativamente la retención.</p>
        
        <h2>Cuida tu salud</h2>
        <p>Duerme al menos 7-8 horas, mantente hidratado y come alimentos nutritivos. Un cerebro descansado y bien alimentado rinde mucho mejor. Evita las bebidas energéticas y el exceso de cafeína.</p>
        
        <h2>Simula el examen</h2>
        <p>Practica con exámenes anteriores en condiciones reales. Establece un tiempo límite y trabaja sin distracciones. Esto te ayudará a gestionar mejor el tiempo y reducir la ansiedad el día del examen.</p>
      `,
      date: '15 Enero 2026',
      readTime: '5 min',
      category: 'Estudiantes',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Cómo ser un profesor más efectivo online',
      excerpt: 'Técnicas y herramientas para mejorar tus clases virtuales y mantener a tus alumnos motivados.',
      content: `
        <h2>Prepara tu entorno</h2>
        <p>Asegúrate de tener buena iluminación, una cámara de calidad y un fondo profesional. Un buen micrófono es esencial - el audio claro es más importante que el video. Elimina ruidos y distracciones del entorno.</p>
        
        <h2>Interacción constante</h2>
        <p>Haz preguntas frecuentes, usa encuestas y permite que los alumnos participen activamente. Las clases monótonas pierden la atención rápidamente. Usa el chat, reacciones y herramientas colaborativas.</p>
        
        <h2>Recursos visuales</h2>
        <p>Comparte pantalla, usa pizarras digitales, presenta slides atractivos y videos cortos. Los recursos visuales mantienen el interés y mejoran la comprensión. Herramientas como Miro o Jamboard son excelentes.</p>
        
        <h2>Establece rutinas</h2>
        <p>Comienza y termina las clases siempre igual. Esto da estructura y seguridad a los alumnos. Incluye momentos de revisión, práctica y feedback en cada sesión.</p>
        
        <h2>Feedback continuo</h2>
        <p>Pregunta regularmente si hay dudas, revisa el progreso y proporciona retroalimentación constructiva. Graba las clases para que puedan repasar y envía resúmenes después de cada sesión.</p>
      `,
      date: '10 Enero 2026',
      readTime: '7 min',
      category: 'Profesores',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop'
    },
    {
      id: 3,
      title: 'La revolución de las clases particulares digitales',
      excerpt: 'Cómo la tecnología está transformando la educación personalizada y las oportunidades que ofrece.',
      content: `
        <h2>Accesibilidad sin fronteras</h2>
        <p>La educación online elimina barreras geográficas. Los estudiantes pueden acceder a los mejores profesores del mundo desde su casa. Ya no importa si vives en una gran ciudad o en un pueblo pequeño.</p>
        
        <h2>Flexibilidad horaria</h2>
        <p>Las plataformas digitales permiten adaptar los horarios a las necesidades de cada persona. Profesores y alumnos pueden conectarse en momentos que les convengan a ambos, facilitando la conciliación.</p>
        
        <h2>Recursos ilimitados</h2>
        <p>Las clases digitales permiten compartir materiales multimedia, enlaces, videos y documentos al instante. Las grabaciones de clases se convierten en una biblioteca de aprendizaje disponible 24/7.</p>
        
        <h2>Costes reducidos</h2>
        <p>Sin necesidad de desplazamientos ni alquiler de espacios físicos, los costes se reducen significativamente. Esto beneficia tanto a profesores como a alumnos, democratizando el acceso a educación de calidad.</p>
        
        <h2>Personalización avanzada</h2>
        <p>Las herramientas digitales permiten adaptar el contenido al ritmo de cada alumno. Los datos y análisis ayudan a identificar áreas de mejora y optimizar el aprendizaje de forma continua.</p>
      `,
      date: '5 Enero 2026',
      readTime: '6 min',
      category: 'Tendencias',
      image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop'
    },
    {
      id: 4,
      title: 'Gestión del tiempo: Organiza tu calendario de estudio',
      excerpt: 'Aprende a planificar tu tiempo de estudio de manera efectiva para maximizar tu productividad.',
      content: `
        <h2>Identifica tus prioridades</h2>
        <p>No todas las asignaturas requieren la misma atención. Identifica cuáles necesitan más tiempo y esfuerzo. Prioriza según dificultad, fechas de exámenes y tu nivel actual en cada materia.</p>
        
        <h2>Crea bloques de tiempo</h2>
        <p>Divide tu día en bloques dedicados a actividades específicas. Asigna franjas horarias fijas para estudiar cada materia. La consistencia es clave - estudiar a las mismas horas cada día crea un hábito.</p>
        
        <h2>Usa un calendario digital</h2>
        <p>Herramientas como Google Calendar te permiten visualizar tu semana completa. Programa recordatorios, establece alarmas y sincroniza con todos tus dispositivos. La planificación visual reduce el estrés.</p>
        
        <h2>Incluye descansos</h2>
        <p>No programes sesiones de estudio maratónicas. Incluye descansos regulares, tiempo para ejercicio, comidas y actividades de ocio. Un estudiante descansado es un estudiante productivo.</p>
        
        <h2>Revisa y ajusta</h2>
        <p>Al final de cada semana, evalúa qué funcionó y qué no. Ajusta tu calendario según necesites. La flexibilidad es importante - no te castigues si un día no cumples el plan al 100%.</p>
      `,
      date: '28 Diciembre 2025',
      readTime: '4 min',
      category: 'Estudiantes',
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&auto=format&fit=crop'
    },
    {
      id: 5,
      title: 'Fija tus precios como profesor particular',
      excerpt: 'Guía completa para establecer tarifas competitivas y justas por tus servicios educativos.',
      content: `
        <h2>Investiga el mercado</h2>
        <p>Antes de fijar tus tarifas, investiga qué cobran otros profesores en tu área y especialidad. Analiza plataformas online, grupos de Facebook y anuncios locales. Conoce tu competencia.</p>
        
        <h2>Valora tu experiencia</h2>
        <p>Tu formación, años de experiencia y especialización tienen valor. Un profesor con máster y 10 años de experiencia puede cobrar más que uno recién graduado. No subestimes tu valor.</p>
        
        <h2>Diferencia por nivel</h2>
        <p>Las clases de universidad o preparación de exámenes oficiales justifican precios más altos que las de ESO. Establece tarifas diferentes según la complejidad y responsabilidad de cada nivel.</p>
        
        <h2>Considera gastos y tiempo</h2>
        <p>Además del tiempo de clase, dedicas tiempo a preparar materiales, corregir ejercicios y seguimiento. Incluye estos costes en tu tarifa. También considera la suscripción de plataforma, impuestos y software.</p>
        
        <h2>Ofrece paquetes</h2>
        <p>Crea paquetes de clases con descuento (ej: 5 clases al precio de 4). Esto incentiva el compromiso a largo plazo y asegura ingresos más estables. Los bonos son atractivos para los alumnos.</p>
        
        <h2>Revisa regularmente</h2>
        <p>Tus tarifas no son permanentes. Revísalas cada 6-12 meses según tu experiencia, demanda y feedback. Si tienes lista de espera, probablemente puedas subir tus precios.</p>
      `,
      date: '20 Diciembre 2025',
      readTime: '8 min',
      category: 'Profesores',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop'
    },
    {
      id: 6,
      title: 'Herramientas digitales para el aprendizaje',
      excerpt: 'Las mejores apps y plataformas que todo estudiante debería conocer en 2026.',
      content: `
        <h2>Notion - Tu segundo cerebro</h2>
        <p>Notion es perfecta para organizar apuntes, crear bases de datos de estudio y planificar proyectos. Combina texto, tablas, calendarios y listas de tareas en un solo lugar. Totalmente personalizable.</p>
        
        <h2>Anki - Memorización efectiva</h2>
        <p>Anki utiliza repetición espaciada para optimizar la memorización. Ideal para vocabulario, fórmulas, fechas y conceptos. Está demostrado científicamente que mejora la retención a largo plazo.</p>
        
        <h2>Forest - Mantén el foco</h2>
        <p>Forest te ayuda a evitar distracciones del móvil. Plantas un árbol virtual que crece mientras estudias sin tocar el teléfono. Si sales de la app, el árbol muere. Gamifica la concentración.</p>
        
        <h2>Quizlet - Práctica interactiva</h2>
        <p>Crea flashcards digitales, juegos y tests. Millones de sets de estudio creados por otros usuarios. Perfecta para preparar exámenes tipo test y repasar de forma amena y efectiva.</p>
        
        <h2>Grammarly - Escritura perfecta</h2>
        <p>Para trabajos y ensayos en inglés, Grammarly corrige gramática, ortografía y estilo. Ofrece sugerencias para mejorar la claridad y el tono. Esencial para estudiantes universitarios.</p>
        
        <h2>Wolfram Alpha - Calculadora inteligente</h2>
        <p>Mucho más que una calculadora. Resuelve ecuaciones, grafica funciones, calcula integrales y proporciona explicaciones paso a paso. Invaluable para matemáticas, física e ingeniería.</p>
      `,
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
              <Card 
                onClick={() => setSelectedArticle(article)}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col"
              >
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