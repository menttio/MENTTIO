import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaveReviewDialog({ booking, student, open, onClose, onSave }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Review.create({
        teacher_id: booking.teacher_id,
        teacher_name: booking.teacher_name,
        student_id: student.id,
        student_name: student.full_name,
        booking_id: booking.id,
        rating,
        comment: comment.trim()
      });

      // Update teacher's average rating
      const allReviews = await base44.entities.Review.filter({ teacher_id: booking.teacher_id });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      
      await base44.entities.Teacher.update(booking.teacher_id, {
        rating: avgRating
      });

      // Create notification for teacher
      await base44.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'booking_new',
        title: 'Nueva valoración',
        message: `${student.full_name} ha valorado tu clase de ${booking.subject_name} con ${rating} estrellas`,
        related_id: booking.id,
        link_page: 'ReviewsHistory'
      });

      // Send push notification to teacher
      try {
        await base44.functions.invoke('sendPushNotification', {
          userEmail: booking.teacher_email,
          title: 'Nueva valoración',
          body: `${student.full_name} te ha dado ${rating} estrellas`,
          data: {
            booking_id: booking.id,
            page: 'ReviewsHistory'
          }
        });
      } catch (pushError) {
        console.error('Error enviando push notification:', pushError);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dejar Reseña</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia con {booking?.teacher_name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Rating */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">¿Cómo fue tu clase?</p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoveredRating(i + 1)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(i + 1)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={cn(
                      "transition-colors",
                      (hoveredRating || rating) > i
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 5 ? 'Excelente' : rating === 4 ? 'Muy bueno' : rating === 3 ? 'Bueno' : rating === 2 ? 'Regular' : 'Mejorable'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos más sobre tu experiencia (opcional)"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
          >
            {saving ? <Loader2 className="animate-spin" /> : 'Enviar Reseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}