import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Calendar, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function TeacherAvailability({ teacherId }) {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const daysOfWeek = [
    { num: 1, name: 'Lun' },
    { num: 2, name: 'Mar' },
    { num: 3, name: 'Mié' },
    { num: 4, name: 'Jue' },
    { num: 5, name: 'Vie' },
    { num: 6, name: 'Sáb' },
    { num: 0, name: 'Dom' }
  ];

  useEffect(() => {
    if (open && teacherId) {
      loadAvailability();
    }
  }, [open, teacherId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const teacherAvailability = await base44.entities.Availability.filter({
        teacher_id: teacherId,
        type: 'regular'
      });
      setAvailability(teacherAvailability);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityForDay = (dayNum) => {
    return availability.find(a => a.day_of_week === dayNum);
  };

  const formatTimeSlots = (slots) => {
    if (!slots || slots.length === 0) return 'No disponible';
    return slots.map(slot => `${slot.start_time} - ${slot.end_time}`).join(', ');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#41f2c0] hover:text-[#35d4a7] hover:bg-[#41f2c0]/10"
        >
          <Clock size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Calendar className="text-[#41f2c0]" size={18} />
            <h4 className="font-semibold text-[#404040]">Disponibilidad Semanal</h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#41f2c0]" size={24} />
            </div>
          ) : (
            <div className="space-y-2">
              {daysOfWeek.map((day) => {
                const dayAvailability = getAvailabilityForDay(day.num);
                const isAvailable = dayAvailability && dayAvailability.time_slots?.length > 0;

                return (
                  <div
                    key={day.num}
                    className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                      isAvailable ? 'bg-[#41f2c0]/5' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 text-center font-medium text-sm ${
                      isAvailable ? 'text-[#41f2c0]' : 'text-gray-400'
                    }`}>
                      {day.name}
                    </div>
                    <div className="flex-1 text-sm">
                      {isAvailable ? (
                        <div className="space-y-1">
                          {dayAvailability.time_slots.map((slot, idx) => (
                            <div key={idx} className="text-[#404040] font-medium">
                              {slot.start_time} - {slot.end_time}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">No disponible</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && availability.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Este profesor aún no ha configurado su disponibilidad
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}