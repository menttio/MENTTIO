import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  parseISO,
  getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import BookingCard from '../components/booking/BookingCard';
import EditBookingDialog from '../components/booking/EditBookingDialog';

export default function TeacherCalendar() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingBooking, setEditingBooking] = useState(null);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();

      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        setTeacher(teachers[0]);

        const allBookings = await base44.entities.Booking.filter({ 
          teacher_email: user.email 
        });
        setBookings(allBookings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const getBookingsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
  };

  const selectedDateBookings = useMemo(() => {
    return getBookingsForDate(selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [selectedDate, bookings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#404040]">Mi Calendario</h1>
        <p className="text-gray-500 mt-2">Visualiza todas tus clases programadas</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {/* Calendar Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
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
              <div className="grid grid-cols-7">
                {/* Empty cells */}
                {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square border-b border-r border-gray-50" />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const dayBookings = getBookingsForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const hasBookings = dayBookings.length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-1 border-b border-r border-gray-50 flex flex-col items-center justify-start transition-all hover:bg-gray-50",
                        isSelected && "bg-[#41f2c0]/10 hover:bg-[#41f2c0]/20",
                        isToday(day) && "font-bold"
                      )}
                    >
                      <span className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                        isSelected && "bg-[#41f2c0] text-white",
                        isToday(day) && !isSelected && "border-2 border-[#41f2c0] text-[#41f2c0]"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      {hasBookings && (
                        <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                          {dayBookings.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[#41f2c0]" />
                          ))}
                          {dayBookings.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{dayBookings.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Details */}
        <div>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#404040] mb-4 flex items-center gap-2">
                <CalendarIcon className="text-[#41f2c0]" size={18} />
                <span className="capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </h3>

              {selectedDateBookings.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateBookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="text-[#41f2c0]" size={14} />
                        <span className="font-medium text-sm">
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="text-gray-400" size={14} />
                        <span className="text-sm text-[#404040]">{booking.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="text-gray-400" size={14} />
                        <span className="text-sm text-gray-500">{booking.student_name}</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setEditingBooking(booking)}
                        >
                          Modificar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="mx-auto mb-2 text-gray-300" size={32} />
                  <p className="text-sm">No hay clases este día</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full list below */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-[#404040] mb-4">
          Clases del día seleccionado
        </h2>
        
        {selectedDateBookings.length > 0 ? (
          <div className="space-y-4">
            {selectedDateBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                userRole="teacher"
                onEdit={(b) => setEditingBooking(b)}
                onRefresh={loadData}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No hay clases programadas para este día</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingBooking && (
        <EditBookingDialog
          booking={editingBooking}
          open={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          onSave={loadData}
        />
      )}
    </div>
  );
}