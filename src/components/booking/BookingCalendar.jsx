import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BookingCalendar({ 
  availableSlots = {}, 
  existingBookings = [],
  onSelectSlot,
  selectedDate,
  selectedTime 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewDate, setViewDate] = useState(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const getAvailableSlotsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSlots[dateStr] || [];
  };

  const isDateAvailable = (date) => {
    if (isBefore(date, startOfDay(new Date()))) return false;
    return getAvailableSlotsForDate(date).length > 0;
  };

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) return;
    setViewDate(date);
    onSelectSlot(date, null);
  };

  const handleTimeSelect = (time) => {
    onSelectSlot(viewDate, time);
  };

  const slotsForSelectedDate = viewDate ? getAvailableSlotsForDate(viewDate) : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="hover:bg-[#41f2c0]/10"
        >
          <ChevronLeft size={20} />
        </Button>
        <h3 className="font-semibold text-lg text-[#404040] capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="hover:bg-[#41f2c0]/10"
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="py-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100">
        {/* Empty cells for alignment */}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const available = isDateAvailable(day);
          const isSelected = viewDate && isSameDay(day, viewDate);
          const isPast = isBefore(day, startOfDay(new Date()));

          const isViewDate = viewDate && isSameDay(day, viewDate);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={!available || isPast}
              className={cn(
                "bg-white aspect-square flex flex-col items-center justify-center relative transition-all",
                available && !isPast && "cursor-pointer hover:bg-[#41f2c0]/10",
                isPast && "text-gray-300 cursor-not-allowed",
                isViewDate && "bg-[#41f2c0] text-white hover:bg-[#41f2c0]",
                isToday(day) && !isViewDate && "font-bold border-2 border-[#41f2c0]"
              )}
            >
              <span className={cn(
                "text-sm",
                isViewDate && "font-semibold"
              )}>
                {format(day, 'd')}
              </span>
              {available && !isPast && !isViewDate && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#41f2c0]" />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}