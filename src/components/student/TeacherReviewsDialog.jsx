import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Star, User, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TeacherReviewsDialog({ teacherId, teacherName, open, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && teacherId) {
      loadReviews();
    }
  }, [open, teacherId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const allReviews = await base44.entities.Review.filter({ teacher_id: teacherId });
      setReviews(allReviews.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Reseñas de {teacherName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : (
          <>
            {/* Summary */}
            <Card className="bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80 mb-1">Valoración Media</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold">{averageRating}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={i < Math.round(averageRating) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{reviews.length}</p>
                    <p className="text-xs opacity-80">Reseñas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <ScrollArea className="max-h-[400px] pr-4">
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#41f2c0] flex items-center justify-center flex-shrink-0">
                            <User className="text-white" size={20} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <h4 className="font-semibold text-sm text-[#404040]">{review.student_name}</h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar size={12} />
                                <span>{format(parseISO(review.created_date), "d MMM yyyy", { locale: es })}</span>
                              </div>
                            </div>
                            
                            {review.comment && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={14} />
                                  <p className="text-xs text-gray-700">{review.comment}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 text-sm">Este profesor aún no tiene reseñas</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}