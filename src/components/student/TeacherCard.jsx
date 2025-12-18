import React from 'react';
import { Star, Clock, DollarSign, User, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function TeacherCard({ 
  teacher, 
  onSelect, 
  onAssign, 
  onRemove, 
  isAssigned = false,
  showActions = true,
  selectedSubject = null
}) {
  const subjectInfo = selectedSubject 
    ? teacher.subjects?.find(s => s.subject_id === selectedSubject)
    : teacher.subjects?.[0];

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

          {/* Subjects */}
          <div className="flex flex-wrap gap-2 mt-3">
            {teacher.subjects?.slice(0, 3).map((subject, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="bg-[#41f2c0]/10 text-[#404040] hover:bg-[#41f2c0]/20"
              >
                {subject.subject_name}
              </Badge>
            ))}
            {teacher.subjects?.length > 3 && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                +{teacher.subjects.length - 3}
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
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        {subjectInfo && (
          <div className="flex items-center gap-1 text-[#404040]">
            <DollarSign size={18} className="text-[#41f2c0]" />
            <span className="font-semibold text-lg">{subjectInfo.price_per_hour}€</span>
            <span className="text-gray-500 text-sm">/hora</span>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2">
            {isAssigned ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemove?.(teacher)}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 size={16} className="mr-1" />
                  Quitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSelect?.(teacher)}
                  className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  Reservar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => onAssign?.(teacher)}
                className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
              >
                <Plus size={16} className="mr-1" />
                Añadir
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}