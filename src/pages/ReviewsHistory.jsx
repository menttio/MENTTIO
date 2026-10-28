import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Loader2, MessageSquare, Calendar, User, Copy, Check, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import { mediaValoracion, infoFuente, textoSinNota } from '@/lib/resenas';

export default function ReviewsHistory() {
  const [reviews, setReviews] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
          
          const allReviews = await base44.entities.Review.filter({ 
            teacher_id: teachers[0].id 
          });
          
          // Sort by creation date (newest first)
          const sortedReviews = allReviews.sort((a, b) => 
            new Date(b.created_date) - new Date(a.created_date)
          );
          
          setReviews(sortedReviews);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Antes esto ponía 5,0 cuando no había ninguna reseña, es decir una nota inventada, y
  // sumaba como ceros las reseñas que llegaron sin puntuación: siete reseñas buenas sin
  // estrellas daban una media de 0,0. Ahora la media sale solo de las que puntuaron.
  const { media, puntuadas, verificadas } = mediaValoracion(reviews);

  const enlaceResenas = teacher
    ? `${window.location.origin}${createPageUrl('DejarResena')}?p=${teacher.id}`
    : '';

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlaceResenas);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (_e) {
      // Sin permiso de portapapeles (pasa en algunos navegadores de móvil): se selecciona
      // el texto para que lo copie a mano en vez de dejarle sin nada.
      const campo = document.getElementById('enlace-resenas');
      if (campo) campo.select();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Mis Valoraciones</h1>
        <p className="text-gray-500 mt-2 text-sm">Opiniones de tus alumnos sobre tus clases</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="fill-white" size={24} />
              </div>
              <p className="text-4xl font-bold">{media === null ? '—' : media.toFixed(1)}</p>
              <p className="text-sm opacity-90">
                {media === null
                  ? textoSinNota(reviews)
                  : `Valoración media (${puntuadas} ${puntuadas === 1 ? 'nota' : 'notas'})`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="text-[#41f2c0]" size={24} />
              </div>
              <p className="text-4xl font-bold text-[#404040]">{reviews.length}</p>
              <p className="text-sm text-gray-500">Total valoraciones</p>
              {reviews.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{verificadas} verificadas</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="text-yellow-400" size={24} />
              </div>
              <p className="text-4xl font-bold text-[#404040]">
                {reviews.filter((r) => Number(r.rating) === 5).length}
              </p>
              <p className="text-sm text-gray-500">5 estrellas</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pedir reseñas a los alumnos de siempre.
          Un profesor que acaba de entrar tiene años de alumnos y cero reseñas aquí, y no se
          le deja escribirlas él: solo las crea el backend cuando quien escribe es un alumno
          con cuenta. Este enlace es la forma de que esos alumnos las dejen de verdad. */}
      <Card className="mb-8 border-[#41f2c0]/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <ShieldCheck className="text-[#0d7a5f] mt-0.5 shrink-0" size={20} />
            <div>
              <h2 className="font-semibold text-[#404040]">Pídeles una reseña a tus alumnos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Mándales este enlace. Cada uno entra con su cuenta y deja la suya. Tú no puedes
                escribir reseñas tuyas, y eso es justo lo que hace que los alumnos nuevos se
                crean las que tienes.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="enlace-resenas"
              readOnly
              value={enlaceResenas}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            />
            <Button
              onClick={copiarEnlace}
              disabled={!enlaceResenas}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-medium shrink-0"
            >
              {copiado ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
              {copiado ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#41f2c0]/10 flex items-center justify-center">
                        <User className="text-[#41f2c0]" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-[#404040]">{review.student_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          <span className="capitalize">
                            {format(parseISO(review.collected_at || review.created_date), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                        {/* De dónde sale la reseña. Las tres fuentes no valen lo mismo y hasta
                            ahora se pintaban igual. */}
                        <Badge
                          className={`mt-1.5 text-[10px] font-medium ${infoFuente(review).tono}`}
                          title={infoFuente(review).detalle}
                        >
                          {infoFuente(review).etiqueta}
                        </Badge>
                      </div>
                    </div>
                    {/* Sin puntuación no se pintan cinco estrellas grises: aparentaría un cero
                        que el alumno nunca puso. */}
                    {review.rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {review.comment && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        "{review.comment}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-12 text-center">
            <Star className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="font-medium text-[#404040] mb-2">
              Aún no tienes valoraciones
            </h3>
            <p className="text-gray-500 text-sm">
              Cuando tus alumnos completen clases y te valoren, aparecerán aquí
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}