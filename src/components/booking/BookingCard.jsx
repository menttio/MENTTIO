import React, { useState } from 'react';
import { format, parseISO, isBefore, addHours, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  MoreVertical, 
  Edit, 
  Trash2, 
  FileUp, 
  Video,
  FileText,
  ExternalLink,
  Loader2,
  Star,
  CreditCard,
  AlertCircle,
  VideoIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import PaymentDialog from './PaymentDialog';

export default function BookingCard({ 
  booking, 
  userRole = 'student',
  onEdit,
  onCancel,
  onUploadFile,
  onRefresh,
  onReview
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [review, setReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [teacher, setTeacher] = useState(null);

  const bookingDate = parseISO(booking.date);
  const bookingDateTime = new Date(`${booking.date}T${booking.start_time}`);
  const bookingEndDateTime = new Date(`${booking.date}T${booking.end_time}`);
  const now = new Date();
  const is24HoursBefore = isAfter(bookingDateTime, addHours(now, 24));
  const isPast = isBefore(bookingEndDateTime, now);
  const isCompleted = booking.status === 'completed' || isPast;
  const isCancelled = booking.status === 'cancelled';
  const needsPayment = isCompleted && booking.payment_status === 'pending' && !isCancelled && userRole === 'student';

  // Students need 24h advance, teachers can always modify
  const canModify = userRole === 'teacher' 
    ? !isCompleted && !isCancelled
    : is24HoursBefore && !isCompleted && !isCancelled;

  // Load teacher info and review for completed classes
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const teacherData = await base44.entities.Teacher.get(booking.teacher_id);
        if (teacherData) {
          setTeacher(teacherData);
        }
      } catch (error) {
        console.error('Error loading teacher:', error);
      }

      if (isCompleted && !isCancelled) {
        setLoadingReview(true);
        base44.entities.Review.filter({ booking_id: booking.id })
          .then(reviews => {
            if (reviews.length > 0) {
              setReview(reviews[0]);
            }
          })
          .catch(console.error)
          .finally(() => setLoadingReview(false));
      }
    };

    loadData();
  }, [booking.id, booking.teacher_id, isCompleted, isCancelled]);

  const statusConfig = {
    scheduled: { label: 'Programada', color: 'bg-[#41f2c0] text-white' },
    completed: { label: 'Completada', color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-600' }
  };

  const displayStatus = isPast && booking.status === 'scheduled' ? 'completed' : booking.status;
  const status = statusConfig[displayStatus] || statusConfig.scheduled;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      
      const newFiles = results.map((result, idx) => ({
        name: files[idx].name,
        url: result.file_url,
        uploaded_by: userRole
      }));
      
      const updatedFiles = [...(booking.files || []), ...newFiles];
      await base44.entities.Booking.update(booking.id, { files: updatedFiles });
      
      // Notify n8n if student uploaded files
      if (userRole === 'student') {
        try {
          await base44.functions.invoke('notifyFileUpload', {
            bookingData: {
              student_name: booking.student_name,
              student_id: booking.student_id,
              student_email: booking.student_email,
              teacher_name: booking.teacher_name,
              teacher_id: booking.teacher_id,
              teacher_email: booking.teacher_email,
              booking_id: booking.id,
              status: booking.status,
              subject_name: booking.subject_name,
              date: booking.date,
              uploaded_files: newFiles.map(f => f.url)
            }
          });
        } catch (webhookError) {
          console.error('Error notificando subida de archivo a n8n:', webhookError);
        }
      }
      
      onRefresh?.();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      setShowUploadDialog(false);
    }
  };

  const handleDeleteFile = async (fileIndex) => {
    try {
      const updatedFiles = booking.files.filter((_, idx) => idx !== fileIndex);
      await base44.entities.Booking.update(booking.id, { files: updatedFiles });
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await base44.entities.Booking.update(booking.id, { status: 'cancelled' });

      // Create notifications for both student and teacher
      await base44.entities.Notification.create({
        user_id: booking.student_id,
        user_email: booking.student_email,
        type: 'booking_cancelled',
        title: 'Clase cancelada',
        message: `Tu clase de ${booking.subject_name} con ${booking.teacher_name} del ${format(bookingDate, "d 'de' MMMM", { locale: es })} ha sido cancelada`,
        related_id: booking.id,
        link_page: 'MyClasses'
      });

      await base44.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'booking_cancelled',
        title: 'Clase cancelada',
        message: `La clase de ${booking.subject_name} con ${booking.student_name} del ${format(bookingDate, "d 'de' MMMM", { locale: es })} ha sido cancelada`,
        related_id: booking.id,
        link_page: 'TeacherCalendar'
      });

      // Delete from Google Calendar for both teacher and student
      try {
        const teachers = await base44.entities.Teacher.filter({ user_email: booking.teacher_email });
        const students = await base44.entities.Student.filter({ user_email: booking.student_email });
        
        if (teachers.length > 0 && teachers[0].google_calendar_connected) {
          await base44.functions.invoke('deleteGoogleCalendarEvent', { 
            bookingId: booking.id,
            userType: 'teacher',
            userEmail: booking.teacher_email
          });
        }
        
        if (students.length > 0 && students[0].google_calendar_connected) {
          await base44.functions.invoke('deleteGoogleCalendarEvent', { 
            bookingId: booking.id,
            userType: 'student',
            userEmail: booking.student_email
          });
        }
      } catch (deleteError) {
        console.error('Error deleting from Google Calendar:', deleteError);
      }

      // Notificar a n8n sobre la cancelación
      try {
        await base44.functions.invoke('notifyN8N', {
          bookingData: {
            booking_id: booking.id,
            student_id: booking.student_id,
            student_name: booking.student_name,
            student_email: booking.student_email,
            student_phone: booking.student_phone || '',
            teacher_name: booking.teacher_name,
            teacher_email: booking.teacher_email,
            teacher_phone: booking.teacher_phone || '',
            subject_name: booking.subject_name,
            price: booking.price,
            date: booking.date,
            start_time: booking.start_time,
            status: 'cancelled'
          }
        });
      } catch (webhookError) {
        console.error('Error notificando cancelación a n8n:', webhookError);
      }

      onRefresh?.();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all",
          isCancelled && "opacity-60"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center">
              <BookOpen className="text-[#41f2c0]" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-[#404040]">{booking.subject_name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User size={14} />
                <span>
                  {userRole === 'student' ? booking.teacher_name : booking.student_name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge className={cn(status.color, "pointer-events-none")}>{status.label}</Badge>
            {isCompleted && !isCancelled && (
              <Badge className={cn(
                booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
                "pointer-events-none"
              )}>
                {booking.payment_status === 'paid' ? 'Pagado' : 'No Pagado'}
              </Badge>
            )}
            
            {!isCancelled && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canModify && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(booking)}>
                        <Edit size={14} className="mr-2" />
                        Cambiar fecha/hora
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowCancelDialog(true)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Cancelar clase
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                    <FileUp size={14} className="mr-2" />
                    Subir archivo
                  </DropdownMenuItem>
                  {userRole === 'teacher' && isCompleted && (
                    <>
                      {booking.payment_status !== 'paid' && (
                        <DropdownMenuItem onClick={async () => {
                          await base44.entities.Booking.update(booking.id, { payment_status: 'paid' });
                          onRefresh?.();
                        }}>
                          <CreditCard size={14} className="mr-2" />
                          Marcar como pagado
                        </DropdownMenuItem>
                      )}
                      {booking.payment_status === 'paid' && (
                        <DropdownMenuItem onClick={async () => {
                          await base44.entities.Booking.update(booking.id, { payment_status: 'pending' });
                          onRefresh?.();
                        }}>
                          <AlertCircle size={14} className="mr-2" />
                          Marcar como no pagado
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {userRole === 'student' && isCompleted && onReview && (
                    <DropdownMenuItem onClick={() => onReview(booking)}>
                      <Star size={14} className="mr-2" />
                      Dejar reseña
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-[#41f2c0]" />
            <span className="text-[#404040] font-medium capitalize">
              {format(bookingDate, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-[#41f2c0]" />
            <span className="text-[#404040]">
              {booking.start_time} - {booking.end_time}
            </span>
          </div>
        </div>

        {/* Meet Link Button */}
        {booking.meet_link && !isCancelled && !isCompleted && (
          <div className="mb-4">
            <a
              href={booking.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#41f2c0] hover:bg-[#35d4a7] text-white text-sm rounded-lg transition-colors"
            >
              <VideoIcon size={14} />
              Unirse a la videollamada
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Price & Payment Status */}
        {booking.price && (
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-[#41f2c0]">
              {booking.price}€
            </div>
            {booking.payment_status === 'paid' && (
              <Badge className="bg-green-100 text-green-700 pointer-events-none">
                <CreditCard size={12} className="mr-1" />
                Pagado
              </Badge>
            )}
          </div>
        )}

        {/* Payment Alert for Student */}
        {needsPayment && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Pago pendiente</p>
                <p className="text-xs text-orange-600 mb-2">Esta clase está pendiente de pago</p>
                <Button
                  size="sm"
                  onClick={() => setShowPaymentDialog(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <CreditCard size={14} className="mr-1" />
                  Pagar ahora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Files */}
        {booking.files && booking.files.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Archivos adjuntos</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {booking.files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1 px-3 py-2 bg-gray-50 rounded-lg text-sm group">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-[#41f2c0] transition-colors flex-1 min-w-0"
                  >
                    <FileText size={14} className="text-[#41f2c0] flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                  </a>
                  {file.uploaded_by === userRole && (
                    <button
                      onClick={() => handleDeleteFile(idx)}
                      className="ml-1 p-1 hover:bg-red-100 rounded transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 size={12} className="text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recording Link - Solo si el profesor tiene plan premium */}
        {isCompleted && booking.recording_url && teacher?.subscription_plan === 'premium' && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <a
              href={booking.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#41f2c0] hover:text-[#35d4a7] font-medium"
            >
              <Video size={18} />
              Ver grabación de la clase
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Mensaje si el profesor no tiene plan premium */}
        {isCompleted && !isCancelled && teacher?.subscription_plan === 'basic' && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Video size={16} />
              <span>Grabación no disponible (el profesor tiene el plan básico)</span>
            </div>
          </div>
        )}

        {/* Review Section */}
        {isCompleted && !isCancelled && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            {loadingReview ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Cargando reseña...
              </div>
            ) : review ? (
              <div className="bg-[#41f2c0]/5 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span className="font-semibold text-[#404040]">
                      {review.rating}/5
                    </span>
                    <span className="text-sm text-gray-500">
                      - Reseña de {userRole === 'teacher' ? review.student_name : 'ti'}
                    </span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                )}
              </div>
            ) : userRole === 'student' && onReview ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReview(booking)}
                className="w-full border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white"
              >
                <Star size={14} className="mr-2" />
                Dejar una reseña
              </Button>
            ) : null}
          </div>
        )}

        {/* Modification Warning */}
        {!canModify && !isCompleted && !isCancelled && userRole === 'student' && (
          <div className="text-xs text-orange-500 mt-4 bg-orange-50 p-2 rounded-lg">
            ⚠️ No se puede modificar a menos de 24h de la clase
          </div>
        )}
      </motion.div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar esta clase?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La clase quedará cancelada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Volver
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="animate-spin" /> : 'Cancelar clase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir archivo</DialogTitle>
            <DialogDescription>
              Sube documentos o materiales para repasar en esta clase
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#41f2c0] transition-colors">
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={uploading}
                multiple
              />
              {uploading ? (
                <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
              ) : (
                <>
                  <FileUp className="text-gray-400 mb-2" size={32} />
                  <span className="text-sm text-gray-500">Haz clic para seleccionar archivos</span>
                  <span className="text-xs text-gray-400 mt-1">Puedes seleccionar varios a la vez</span>
                </>
              )}
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        booking={booking}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={onRefresh}
      />
    </>
  );
}