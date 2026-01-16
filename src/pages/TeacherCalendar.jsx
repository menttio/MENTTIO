import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
  BookOpen,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import CalendarTour from '../components/teacher/CalendarTour';
import GoogleCalendarSync from '../components/calendar/GoogleCalendarSync';

export default function TeacherCalendar() {
  const [teacher, setTeacher] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingBooking, setEditingBooking] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');

  const loadData = async () => {
    try {
      const user = await base44.auth.me();

      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        const teacherData = teachers[0];
        setTeacher(teacherData);
        
        // Show tour if not completed
        if (!teacherData.calendar_tour_completed) {
          setShowTour(true);
        }

        const allBookings = await base44.entities.Booking.filter({ 
          teacher_email: user.email 
        });
        setBookings(allBookings);

        const allAvailabilities = await base44.entities.Availability.filter({
          teacher_id: teacherData.id
        });
        setAvailabilities(allAvailabilities);
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

  const getAvailabilityForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = getDay(date);

    // Check for exception first
    const exception = availabilities.find(
      a => a.type === 'exception' && a.specific_date === dateStr
    );

    if (exception) {
      return {
        type: 'exception',
        isUnavailable: exception.is_unavailable,
        slots: exception.time_slots || []
      };
    }

    // Check regular availability
    const regular = availabilities.find(
      a => a.type === 'regular' && a.day_of_week === dayOfWeek
    );

    if (regular && regular.time_slots?.length > 0) {
      return {
        type: 'regular',
        slots: regular.time_slots
      };
    }

    return null;
  };

  const selectedDateBookings = useMemo(() => {
    const dateBookings = getBookingsForDate(selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    if (paymentFilter === 'unpaid') {
      return dateBookings.filter(b => b.payment_status === 'pending' && b.status !== 'cancelled');
    }
    if (paymentFilter === 'paid') {
      return dateBookings.filter(b => b.payment_status === 'paid');
    }
    return dateBookings;
  }, [selectedDate, bookings, paymentFilter]);

  const selectedDateAvailability = useMemo(() => {
    return getAvailabilityForDate(selectedDate);
  }, [selectedDate, availabilities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <>
      {showTour && teacher && (
        <CalendarTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#404040]">Mi Calendario</h1>
          <p className="text-gray-500 mt-2">Visualiza todas tus clases, disponibilidades y excepciones</p>
        </div>

        {/* Legend */}
        <Card className="mb-6 calendar-legend">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#404040] text-sm">Leyenda</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
              className="text-xs"
            >
              {showLegend ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          {showLegend && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#41f2c0]" />
                <span className="text-gray-600">Clases reservadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-gray-600">Disponible (regular)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400" />
                <span className="text-gray-600">Disponible (excepción)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-gray-600">No disponible</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="calendar-grid">
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
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-[#404040] capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                  </h3>
                  {teacher && (
                    <GoogleCalendarSync userEmail={teacher.user_email} userType="teacher" />
                  )}
                </div>
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
                  const dayAvailability = getAvailabilityForDate(day);
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
                      
                      <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                        {/* Bookings */}
                        {hasBookings && dayBookings.slice(0, 2).map((_, idx) => (
                          <div key={`booking-${idx}`} className="w-1.5 h-1.5 rounded-full bg-[#41f2c0]" />
                        ))}
                        
                        {/* Availability indicators */}
                        {dayAvailability && !dayAvailability.isUnavailable && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            dayAvailability.type === 'exception' ? "bg-purple-400" : "bg-blue-400"
                          )} />
                        )}
                        
                        {/* Unavailable exception */}
                        {dayAvailability?.isUnavailable && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        )}
                        
                        {hasBookings && dayBookings.length > 2 && (
                          <span className="text-[10px] text-gray-500">+{dayBookings.length - 2}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Details */}
        <div className="day-detail-panel">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#404040] mb-4 flex items-center gap-2">
                <CalendarIcon className="text-[#41f2c0]" size={18} />
                <span className="capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </h3>

              {/* Bookings */}
              {selectedDateBookings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Clases Reservadas</h4>
                  <div className="space-y-2">
                    {selectedDateBookings.map((booking) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 rounded-xl bg-[#41f2c0]/10 border border-[#41f2c0]/20 hover:bg-[#41f2c0]/20 transition-colors cursor-pointer"
                        onClick={() => setEditingBooking(booking)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="text-[#41f2c0]" size={14} />
                          <span className="font-medium text-sm">
                            {booking.start_time} - {booking.end_time}
                          </span>
                          <Badge className="ml-auto bg-[#41f2c0] text-white text-xs">
                            {booking.status === 'scheduled' ? 'Programada' : booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="text-gray-500" size={14} />
                          <span className="text-sm text-[#404040] font-medium">{booking.subject_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="text-gray-500" size={14} />
                          <span className="text-sm text-gray-600">{booking.student_name}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability */}
              {selectedDateAvailability && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Disponibilidad</h4>
                  {selectedDateAvailability.isUnavailable ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-sm text-red-600 font-medium">Día no disponible (excepción)</p>
                    </div>
                  ) : (
                    <div className={cn(
                      "p-3 rounded-xl border",
                      selectedDateAvailability.type === 'exception' 
                        ? "bg-purple-50 border-purple-200" 
                        : "bg-blue-50 border-blue-200"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn(
                          "text-xs",
                          selectedDateAvailability.type === 'exception'
                            ? "bg-purple-500"
                            : "bg-blue-500"
                        )}>
                          {selectedDateAvailability.type === 'exception' ? 'Excepción' : 'Horario regular'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDateAvailability.slots.map((slot, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 rounded bg-white border text-gray-700">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedDateBookings.length && !selectedDateAvailability && (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="mx-auto mb-2 text-gray-300" size={32} />
                  <p className="text-sm">No hay clases ni disponibilidad configurada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full list below */}
      <div className="mt-8 booking-list-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#404040]">
            Clases del día seleccionado
          </h2>
          <Tabs value={paymentFilter} onValueChange={setPaymentFilter}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unpaid">No Pagadas</TabsTrigger>
              <TabsTrigger value="paid">Pagadas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
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
    </>
  );
}