import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, addDays, getDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import BookingCalendar from './BookingCalendar';

export default function EditBookingDialog({ booking, open, onClose, onSave, userRole = 'student' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilities, setAvailabilities] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allAvailabilities = await base44.entities.Availability.filter({
          teacher_id: booking.teacher_id
        });
        setAvailabilities(allAvailabilities);

        const allBookings = await base44.entities.Booking.filter({ 
          teacher_id: booking.teacher_id,
          status: 'scheduled'
        });
        // Exclude current booking
        setExistingBookings(allBookings.filter(b => b.id !== booking.id));

        // Load teacher
        const teachers = await base44.entities.Teacher.filter({ id: booking.teacher_id });
        if (teachers.length > 0) {
          setTeacher(teachers[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (open && booking) {
      loadData();
    }
  }, [open, booking]);

  // Load Google Calendar events when teacher is loaded
  useEffect(() => {
    const loadGoogleEvents = async () => {
      if (!teacher?.google_calendar_connected) return;

      try {
        const now = new Date();
        const endDate = addDays(now, 30);

        const response = await base44.functions.invoke('getGoogleCalendarEvents', {
          startDate: format(now, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          userType: 'teacher',
          userEmail: teacher.user_email
        });

        setGoogleCalendarEvents(response.data.events || []);
      } catch (error) {
        console.error('Error loading Google Calendar events:', error);
      }
    };

    loadGoogleEvents();
  }, [teacher]);

  const generateHourlySlots = (timeSlots) => {
    const allSlots = [];
    const classDuration = booking?.duration_minutes || 60;

    timeSlots.forEach(slot => {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      // Calculate the last possible start time (end_time - class duration)
      const endTimeInMinutes = endHour * 60 + endMin;
      const lastStartTimeInMinutes = endTimeInMinutes - classDuration;

      let currentHour = startHour;
      let currentMin = startMin;
      let currentTimeInMinutes = currentHour * 60 + currentMin;

      while (currentTimeInMinutes <= lastStartTimeInMinutes) {
        allSlots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
        currentMin += 30; // Generate slots every 30 minutes
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
        currentTimeInMinutes = currentHour * 60 + currentMin;
      }
    });

    return allSlots;
  };

  const availableSlots = useMemo(() => {
    if (!booking) return {};
    
    const slots = {};
    const now = new Date();
    const minDateTime = userRole === 'student' ? addDays(now, 1) : now; // 24h for students, no limit for teachers
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);
      
      const exception = availabilities.find(
        a => a.type === 'exception' && a.specific_date === dateStr
      );
      
      if (exception) {
        if (exception.is_unavailable) continue;
        slots[dateStr] = generateHourlySlots(exception.time_slots || []);
      } else {
        const regular = availabilities.find(
          a => a.type === 'regular' && a.day_of_week === dayOfWeek
        );
        if (regular && regular.time_slots) {
          slots[dateStr] = generateHourlySlots(regular.time_slots);
        }
      }
      
      if (slots[dateStr]) {
        const blockedSlots = new Set();
        const classDuration = booking?.duration_minutes || 60;
        
        // Block slots within 24h for students
        if (userRole === 'student') {
          slots[dateStr]?.forEach(slot => {
            const [slotHour, slotMin] = slot.split(':').map(Number);
            const slotDateTime = new Date(dateStr);
            slotDateTime.setHours(slotHour, slotMin, 0, 0);
            
            if (slotDateTime < minDateTime) {
              blockedSlots.add(slot);
            }
          });
        }
        
        // Block slots based on existing bookings (check for overlap)
        existingBookings
          .filter(b => b.date === dateStr)
          .forEach(existingBooking => {
            const [bookingHour, bookingMin] = existingBooking.start_time.split(':').map(Number);
            const [bookingEndHour, bookingEndMin] = existingBooking.end_time.split(':').map(Number);
            
            // Block all slots where a new class would overlap
            slots[dateStr]?.forEach(slot => {
              const [slotHour, slotMin] = slot.split(':').map(Number);
              
              // New class would start at slotHour:slotMin and end classDuration minutes later
              const newClassStart = slotHour * 60 + slotMin;
              const newClassEnd = newClassStart + classDuration;
              
              // Existing booking time in minutes
              const bookingStart = bookingHour * 60 + bookingMin;
              const bookingEnd = bookingEndHour * 60 + bookingEndMin;
              
              // Check if they overlap: newClassStart < bookingEnd AND newClassEnd > bookingStart
              if (newClassStart < bookingEnd && newClassEnd > bookingStart) {
                blockedSlots.add(slot);
              }
            });
          });
        
        // Block Google Calendar events (check for overlap)
        const eventsForDay = googleCalendarEvents.filter(e => {
          if (!e.start || !e.end) return false;
          const eventDate = format(parseISO(e.start), 'yyyy-MM-dd');
          return eventDate === dateStr;
        });

        eventsForDay.forEach(e => {
          const eventStart = parseISO(e.start);
          const eventEnd = parseISO(e.end);

          // Block all slots where a class would overlap with the event
          slots[dateStr]?.forEach(slot => {
            const [slotHour, slotMin] = slot.split(':').map(Number);

            // Create slot start time on the same date
            const slotStart = new Date(dateStr);
            slotStart.setHours(slotHour, slotMin, 0, 0);

            // Calculate when a class starting at this slot would end
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + classDuration);

            // Block if a class starting at this slot overlaps with the event
            // Overlap occurs if: slotStart < eventEnd AND slotEnd > eventStart
            if (slotStart < eventEnd && slotEnd > eventStart) {
              blockedSlots.add(slot);
            }
          });
        });
        
        slots[dateStr] = slots[dateStr].filter(s => !blockedSlots.has(s));
      }
    }
    
    return slots;
  }, [availabilities, existingBookings, googleCalendarEvents, booking, userRole]);

  const handleSlotSelect = (date, time) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setSaving(true);
    try {
      const newDateStr = format(selectedDate, 'yyyy-MM-dd');
      const newEndTime = calculateEndTime(selectedTime, booking.duration_minutes || 60);
      
      await base44.entities.Booking.update(booking.id, {
        date: newDateStr,
        start_time: selectedTime,
        end_time: newEndTime
      });

      // Create notifications for both student and teacher
      const newDate = format(selectedDate, "d 'de' MMMM", { locale: es });
      await base44.entities.Notification.create({
        user_id: booking.student_id,
        user_email: booking.student_email,
        type: 'booking_modified',
        title: 'Clase reprogramada',
        message: `Tu clase de ${booking.subject_name} con ${booking.teacher_name} se ha cambiado a ${newDate} a las ${selectedTime}`,
        related_id: booking.id,
        link_page: 'MyClasses'
      });

      await base44.entities.Notification.create({
        user_id: booking.teacher_id,
        user_email: booking.teacher_email,
        type: 'booking_modified',
        title: 'Clase reprogramada',
        message: `La clase de ${booking.subject_name} con ${booking.student_name} se ha cambiado a ${newDate} a las ${selectedTime}`,
        related_id: booking.id,
        link_page: 'TeacherCalendar'
      });

      // Sync with Google Calendar for both teacher and student
      try {
        const teachers = await base44.entities.Teacher.filter({ user_email: booking.teacher_email });
        const students = await base44.entities.Student.filter({ user_email: booking.student_email });
        
        if (teachers.length > 0 && teachers[0].google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: booking.id,
            userType: 'teacher',
            userEmail: booking.teacher_email
          });
        }
        
        if (students.length > 0 && students[0].google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: booking.id,
            userType: 'student',
            userEmail: booking.student_email
          });
        }
      } catch (syncError) {
        console.error('Error syncing with Google Calendar:', syncError);
      }

      // Notificar a n8n sobre la modificación
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
            date: newDateStr,
            start_time: selectedTime,
            status: 'modified'
          }
        });
      } catch (webhookError) {
        console.error('Error notificando modificación a n8n:', webhookError);
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar fecha y hora</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Clase actual:</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="text-[#41f2c0]" size={16} />
                  <span className="font-medium capitalize">
                    {format(parseISO(booking.date), "d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-[#41f2c0]" size={16} />
                  <span>{booking.start_time} - {booking.end_time}</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <BookingCalendar
                  availableSlots={availableSlots}
                  existingBookings={existingBookings}
                  onSelectSlot={handleSlotSelect}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                />
              </div>
              
              <div>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={18} className="text-[#41f2c0]" />
                      <h4 className="font-medium text-[#404040]">Horarios Disponibles</h4>
                    </div>
                    
                    {selectedDate ? (
                      <>
                        <p className="text-sm text-gray-500 mb-3 capitalize">
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </p>
                        {availableSlots[format(selectedDate, 'yyyy-MM-dd')]?.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availableSlots[format(selectedDate, 'yyyy-MM-dd')].map((slot) => (
                              <Button
                                key={slot}
                                variant={selectedTime === slot ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSlotSelect(selectedDate, slot)}
                                className={cn(
                                  "w-full justify-center transition-all",
                                  selectedTime === slot
                                    ? "bg-[#41f2c0] hover:bg-[#35d4a7] border-[#41f2c0]"
                                    : "hover:border-[#41f2c0] hover:text-[#41f2c0]"
                                )}
                              >
                                {slot}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm text-center py-8">
                            No hay horarios disponibles
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-8">
                        Selecciona una fecha en el calendario
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {selectedDate && selectedTime && (
              <div className="mt-4 p-4 bg-[#41f2c0]/10 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Nueva fecha:</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-[#41f2c0]" size={16} />
                    <span className="font-semibold capitalize">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-[#41f2c0]" size={16} />
                    <span className="font-semibold">{selectedTime}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedDate || !selectedTime || saving}
            className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
          >
            {saving ? <Loader2 className="animate-spin" /> : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}