import React from 'react';
import { Star, User, Clock, BookOpen, Mail, Phone, GraduationCap, Award, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TeacherAvailability from './TeacherAvailability';

export default function MyTeacherCard({ teacher, assignedSubjects, onRemove }) {
  return (
    <Card className="hover:shadow-lg transition-all border border-gray-100">
      <CardContent className="p-6">
        {/* Header with photo and basic info */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#41f2c0] to-[#35d4a7] flex items-center justify-center flex-shrink-0 shadow-md mx-auto sm:mx-0">
            {teacher.profile_photo ? (
              <img 
                src={teacher.profile_photo} 
                alt={teacher.full_name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <User className="text-white" size={36} />
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left w-full">
            <h3 className="text-lg md:text-xl font-bold text-[#404040] mb-1">
              {teacher.full_name}
            </h3>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Star className="text-yellow-400 fill-yellow-400" size={16} />
                <span className="font-semibold">{teacher.rating?.toFixed(1) || '5.0'}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen size={16} />
                <span>{teacher.total_classes || 0} clases</span>
              </div>
            </div>

            {/* Subjects with levels */}
            <div className="flex flex-wrap gap-2 mb-3">
              {assignedSubjects.map((subject, idx) => (
                <Badge 
                  key={idx}
                  className="bg-[#41f2c0] text-white"
                >
                  {subject.subject_name} - {subject.level}
                </Badge>
              ))}
            </div>

            {/* Recording Badge */}
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="w-fit">
                    {teacher.subscription_plan === 'premium' ? (
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
                      teacher.corporate_email && teacher.corporate_email.includes('@menttio.com') ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Video size={20} className={teacher.corporate_email && teacher.corporate_email.includes('@menttio.com') ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#404040] mb-1.5">
                        {teacher.corporate_email && teacher.corporate_email.includes('@menttio.com') ? '✓ Grabación disponible' : '✗ Sin grabación'}
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {teacher.corporate_email && teacher.corporate_email.includes('@menttio.com')
                          ? 'Las clases con este profesor se graban automáticamente. Podrás verlas repetidas desde la plataforma todas las veces que quieras.'
                          : 'Las clases con este profesor no se graban. Solo podrás asistir en vivo a la clase.'}
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Bio */}
        {teacher.bio && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 line-clamp-3">
              {teacher.bio}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
          {teacher.education && (
            <div className="flex items-start gap-3">
              <GraduationCap className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500">Formación</p>
                <p className="text-sm text-[#404040] font-medium">{teacher.education}</p>
              </div>
            </div>
          )}

          {teacher.experience_years !== undefined && (
            <div className="flex items-start gap-3">
              <Award className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500">Experiencia</p>
                <p className="text-sm text-[#404040] font-medium">
                  {teacher.experience_years} {teacher.experience_years === 1 ? 'año' : 'años'}
                </p>
              </div>
            </div>
          )}

          {teacher.phone && (
            <div className="flex items-start gap-3">
              <Phone className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm text-[#404040] font-medium">{teacher.phone}</p>
              </div>
            </div>
          )}

          {teacher.user_email && (
            <div className="flex items-start gap-3">
              <Mail className="text-[#41f2c0] flex-shrink-0 mt-0.5" size={18} />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-[#404040] font-medium break-words">{teacher.user_email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Specializations */}
        {teacher.specializations && teacher.specializations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Especializaciones</p>
            <div className="flex flex-wrap gap-2">
              {teacher.specializations.map((spec, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Teaching Methods */}
        {teacher.teaching_methods && teacher.teaching_methods.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Métodos de enseñanza</p>
            <div className="flex flex-wrap gap-2">
              {teacher.teaching_methods.map((method, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {method}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {teacher.languages && teacher.languages.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Idiomas</p>
            <div className="flex flex-wrap gap-2">
              {teacher.languages.map((lang, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <TeacherAvailability teacherId={teacher.id} />
            <span className="text-xs text-gray-500">Ver disponibilidad</span>
          </div>

          {onRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(teacher)}
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full sm:w-auto"
            >
              Eliminar profesor
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}