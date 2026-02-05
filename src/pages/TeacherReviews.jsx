import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Star, User, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function TeacherReviews() {
  const [reviews, setReviews] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const user = await base44.auth.me();
        const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
        
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
          const allReviews = await base44.entities.Review.filter({ teacher_id: teachers[0].id });
          setReviews(allReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-[#404040] mb-2">Mis Reseñas</h1>
        <p className="text-gray-500">Todas las valoraciones de tus alumnos</p>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-8 bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80 mb-1">Valoración Media</p>
                <div className="flex items-center gap-3">
                  <p className="text-5xl font-bold">{averageRating}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={24}
                        className={i < Math.round(averageRating) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{reviews.length}</p>
                <p className="text-sm opacity-80">Total reseñas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 2) }}
            >
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#41f2c0] flex items-center justify-center flex-shrink-0">
                      <User className="text-white" size={24} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-[#404040]">{review.student_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {review.rating === 5 ? 'Excelente' : 
                               review.rating === 4 ? 'Muy bueno' : 
                               review.rating === 3 ? 'Bueno' : 
                               review.rating === 2 ? 'Regular' : 'Mejorable'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar size={14} />
                          <span>{format(parseISO(review.created_date), "d 'de' MMMM, yyyy", { locale: es })}</span>
                        </div>
                      </div>
                      
                      {review.comment && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={16} />
                            <p className="text-sm text-gray-700">{review.comment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-12 text-center">
            <Star className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="font-semibold text-[#404040] mb-2 text-xl">Aún no tienes reseñas</h3>
            <p className="text-gray-500">Cuando completes clases, tus alumnos podrán dejarte valoraciones</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}