import React, { useState } from 'react';
import { Star, Clock, DollarSign, User, Plus, Trash2, MessageCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import TeacherAvailability from './TeacherAvailability';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TeacherCard({ 
  teacher, 
  onSelect, 
  onAssign, 
  onRemove, 
  isAssigned = false,
  showActions = true,
  selectedSubject = null
}) {
  const navigate = useNavigate();
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  
  const subjectInfo = selectedSubject 
    ? teacher.subjects?.find(s => s.subject_id === selectedSubject)
    : teacher.subjects?.[0];

  // Check if teacher has recording capability (corporate email with @menttio.com)
  const hasRecording = teacher.corporate_email && teacher.corporate_email.includes('@menttio.com');

  // Calculate price display
  const priceDisplay = selectedSubject && subjectInfo
    ? `${subjectInfo.price_per_hour}€`
    : (() => {
        const prices = teacher.subjects?.map(s => s.price_per_hour) || [];
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return prices.length > 1 && minPrice !== maxPrice 
          ? `${minPrice}€ - ${maxPrice}€`
          : `${minPrice}€`;
      })();

  const handleStartChat = async () => {
    setStartingChat(true);
    try {
      const user = await base44.auth.me();
      const students = await base44.entities.Student.filter({ user_email: user.email });
      
      if (students.length === 0) {
        alert('No se encontró tu perfil de estudiante');
        setStartingChat(false);
        return;
      }

      const student = students[0];

      // Check if conversation already exists
      const existingConversations = await base44.entities.Conversation.filter({
        student_id: student.id,
        teacher_id: teacher.id
      });

      if (existingConversations.length > 0) {
        // Navigate to existing conversation
        navigate(createPageUrl('Messages'));
        return;
      }

      // Create new conversation
      await base44.entities.Conversation.create({
        student_id: student.id,
        student_name: student.full_name,
        student_email: user.email,
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        teacher_email: teacher.user_email,
        unread_count_student: 0,
        unread_count_teacher: 0
      });

      // Navigate to messages
      navigate(createPageUrl('Messages'));
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Hubo un error al iniciar el chat');
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div className="flex items-start gap-4">
        {/* Profile Photo */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {teacher.profile_photo ? (
            <img 
              src={teacher.profile_photo} 
              alt={teacher.full_name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="text-white" size={28} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#404040] text-lg truncate">
            {teacher.full_name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="text-yellow-400 fill-yellow-400" size={14} />
              <span className="text-sm font-medium text-[#404040]">
                {teacher.rating?.toFixed(1) || '5.0'}
              </span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-500">
              {teacher.total_classes || 0} clases
            </span>
          </div>

          {/* Recording Badge - Prominent */}
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="mt-2 mb-1 w-fit">
                  {hasRecording ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1.5 cursor-help">
                      <Video size={14} />
                      <span className="font-medium">Grabación disponible</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 flex items-center gap-1.5 cursor-help">
                      <Video size={14} className="opacity-50" />
                      <span>Sin grabación</span>
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                className="max-w-xs bg-white border-2 border-[#41f2c0] shadow-xl rounded-xl p-4" 
                side="top"
                sideOffset={8}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    hasRecording ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Video size={20} className={hasRecording ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#404040] mb-1.5">
                      {hasRecording ? '✓ Grabación disponible' : '✗ Sin grabación'}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {hasRecording 
                        ? 'Las clases con este profesor se graban automáticamente. Podrás verlas repetidas desde la plataforma todas las veces que quieras.'
                        : 'Las clases con este profesor no se graban. Solo podrás asistir en vivo a la clase.'}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Subjects */}
          <div className="flex flex-wrap gap-2 mt-2">
            {teacher.subjects?.slice(0, 3).map((subject, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="bg-[#41f2c0]/10 text-[#404040] hover:bg-[#41f2c0]/20"
              >
                {subject.subject_name} <span className="text-xs opacity-70">({subject.level})</span>
              </Badge>
            ))}
            {teacher.subjects?.length > 3 && (
              <Badge 
                variant="secondary" 
                className="bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                onClick={() => setShowAllSubjects(true)}
              >
                +{teacher.subjects.length - 3} más
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {teacher.bio && (
        <p className="text-gray-500 text-sm mt-4 line-clamp-2">
          {teacher.bio}
        </p>
      )}

      {/* Price & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {priceDisplay && (
            <div className="flex items-center gap-1 text-[#404040]">
              <DollarSign size={18} className="text-[#41f2c0]" />
              <span className="font-semibold text-lg">{priceDisplay}</span>
              <span className="text-gray-500 text-sm">/hora</span>
            </div>
          )}
          <TeacherAvailability teacherId={teacher.id} />
        </div>

        {showActions && (
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartChat}
              disabled={startingChat}
              className="border-[#41f2c0] text-[#41f2c0] hover:bg-[#41f2c0] hover:text-white flex-1 md:flex-initial"
            >
              <MessageCircle size={16} className="mr-1" />
              {startingChat ? 'Abriendo...' : 'Chatear'}
            </Button>
            {isAssigned ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove?.(teacher)}
                className="text-red-500 border-red-200 hover:bg-red-50 flex-1 md:flex-initial"
              >
                <Trash2 size={16} className="mr-1" />
                Quitar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onAssign?.(teacher)}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white flex-1 md:flex-initial"
              >
                <Plus size={16} className="mr-1" />
                Añadir
              </Button>
            )}
          </div>
        )}
      </div>

      {/* All Subjects Dialog */}
      <Dialog open={showAllSubjects} onOpenChange={setShowAllSubjects}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignaturas de {teacher.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
            {teacher.subjects?.map((subject, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#41f2c0] transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-[#404040]">{subject.subject_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{subject.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#41f2c0]">{subject.price_per_hour}€</p>
                  <p className="text-xs text-gray-500">por hora</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}