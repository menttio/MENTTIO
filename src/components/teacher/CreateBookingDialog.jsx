import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, User, BookOpen, Loader2, Check } from 'lucide-react';
import { format, addDays, getDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import BookingCalendar from '../booking/BookingCalendar';
import { cn } from '@/lib/utils';

export default function CreateBookingDialog({ open, onOpenChange, teacher, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);

  const duration = 60;

  useEffect(() => {
    if (open && teacher) {
      loadStudents();
      loadBookings();
      loadGoogleEvents();
    } else {
      // Reset on close
      setStep(1);
      setSelectedStudent(null);
      setSelectedSubject(null);
      setSelectedDate(null);
      setSelectedTime(null);
    }
  }, [open, teacher]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const allStudents = await base44.entities.Student.list();
      // Filter students who have assigned this teacher
      const studentsWithTeacher = allStudents.filter(student => 
        student.assigned_teachers?.some(at => at.teacher_id === teacher.id)
      );
      setStudents(studentsWithTeacher);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const allBookings = await base44.entities.Booking.filter({ 
        teacher_id: teacher.id,
        status: 'scheduled' 
      });
      setExistingBookings(allBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadGoogleEvents = async () => {
    if (!teacher.google_calendar_connected) return;

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

  // When student is selected, update available subjects
  useEffect(() => {
    if (selectedStudent) {
      const studentAssignments = selectedStudent.assigned_teachers?.filter(
        at => at.teacher_id === teacher.id
      ) || [];
      setAvailableSubjects(studentAssignments);
      setSelectedSubject(null);
    }
  }, [selectedStudent, teacher]);

  const generateHourlySlots = (startHour = 6, endHour = 23) => {
    const allSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return allSlots;
  };

  // Calculate available slots (ignoring teacher availability, only considering bookings and Google Calendar)
  const availableSlots = useMemo(() => {
    if (!teacher) return {};
    
    const slots = {};
    
    // Generate slots for next 30 days
    const now = new Date();
    const minDate = new Date(now);
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(minDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Generate all possible slots (6am to 11pm)
      slots[dateStr] = generateHourlySlots(6, 23);
      
      const blockedSlots = new Set();
      
      // Block slots based on existing bookings
      existingBookings
        .filter(b => b.date === dateStr)
        .forEach(booking => {
          const [bookingHour, bookingMin] = booking.start_time.split(':').map(Number);
          const [bookingEndHour, bookingEndMin] = booking.end_time.split(':').map(Number);
          
          // Block all slots where a new 1-hour class would overlap
          slots[dateStr]?.forEach(slot => {
            const [slotHour, slotMin] = slot.split(':').map(Number);
            
            const newClassStart = slotHour * 60 + slotMin;
            const newClassEnd = newClassStart + 60;
            
            const bookingStart = bookingHour * 60 + bookingMin;
            const bookingEnd = bookingEndHour * 60 + bookingEndMin;
            
            if (newClassStart < bookingEnd && newClassEnd > bookingStart) {
              blockedSlots.add(slot);
            }
          });
        });

      // Filter out Google Calendar busy slots
      const eventsForDay = googleCalendarEvents.filter(e => {
        if (!e.start || !e.end) return false;
        const eventDate = format(parseISO(e.start), 'yyyy-MM-dd');
        return eventDate === dateStr;
      });

      eventsForDay.forEach(e => {
        const eventStart = parseISO(e.start);
        const eventEnd = parseISO(e.end);

        slots[dateStr]?.forEach(slot => {
          const [slotHour, slotMin] = slot.split(':').map(Number);

          const slotStart = new Date(dateStr);
          slotStart.setHours(slotHour, slotMin, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + 60);

          if (slotStart < eventEnd && slotEnd > eventStart) {
            blockedSlots.add(slot);
          }
        });
      });

      slots[dateStr] = slots[dateStr].filter(s => !blockedSlots.has(s));
    }
    
    return slots;
  }, [teacher, existingBookings, googleCalendarEvents]);

  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const calculatePrice = () => {
    if (!teacher || !selectedSubject) return 0;
    const subjectInfo = teacher.subjects?.find(s => s.subject_id === selectedSubject.subject_id);
    if (!subjectInfo) return 0;
    return (subjectInfo.price_per_hour * duration) / 60;
  };

  const handleSlotSelect = (date, time) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleConfirmBooking = async () => {
    setSaving(true);
    try {
      const studentObj = students.find(s => s.id === selectedStudent);

      const newBooking = await base44.entities.Booking.create({
        student_id: studentObj.id,
        student_name: studentObj.full_name,
        student_email: studentObj.user_email,
        student_phone: studentObj.phone || '',
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        teacher_email: teacher.user_email,
        teacher_phone: teacher.phone || '',
        subject_id: selectedSubject.subject_id,
        subject_name: selectedSubject.subject_name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTime,
        end_time: calculateEndTime(selectedTime, duration),
        duration_minutes: duration,
        price: calculatePrice(),
        status: 'scheduled',
        payment_status: 'pending',
        files: []
      });

      // Create notifications
      const bookingDate = format(selectedDate, "d 'de' MMMM", { locale: es });

      await base44.entities.Notification.create({
        user_id: studentObj.id,
        user_email: studentObj.user_email,
        type: 'booking_new',
        title: 'Clase reservada',
        message: `${teacher.full_name} ha reservado una clase de ${selectedSubject.subject_name} contigo para el ${bookingDate} a las ${selectedTime}`,
        related_id: newBooking.id,
        link_page: 'MyClasses'
      });

      await base44.entities.Notification.create({
        user_id: teacher.id,
        user_email: teacher.user_email,
        type: 'booking_new',
        title: 'Clase creada',
        message: `Has creado una clase de ${selectedSubject.subject_name} con ${studentObj.full_name} para el ${bookingDate} a las ${selectedTime}`,
        related_id: newBooking.id,
        link_page: 'TeacherCalendar'
      });

      // Send push notification to student
      try {
        await base44.functions.invoke('sendPushNotification', {
          userEmail: studentObj.user_email,
          title: 'Nueva clase reservada',
          body: `${teacher.full_name} ha reservado una clase de ${selectedSubject.subject_name} contigo para el ${bookingDate} a las ${selectedTime}`,
          data: {
            booking_id: newBooking.id,
            page: 'MyClasses'
          }
        });
      } catch (pushError) {
        console.error('Error enviando push notification:', pushError);
      }

      // Sync with Google Calendar
      try {
        if (teacher.google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: newBooking.id,
            userType: 'teacher',
            userEmail: teacher.user_email
          });
        }
        if (studentObj.google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: newBooking.id,
            userType: 'student',
            userEmail: studentObj.user_email
          });
        }
      } catch (syncError) {
        console.error('Error syncing with Google Calendar:', syncError);
      }

      // Notify n8n
      try {
        await base44.functions.invoke('notifyN8N', {
          bookingData: {
            booking_id: newBooking.id,
            student_id: studentObj.id,
            student_name: studentObj.full_name,
            student_email: studentObj.user_email,
            student_phone: studentObj.phone || '',
            teacher_name: teacher.full_name,
            teacher_email: teacher.user_email,
            teacher_phone: teacher.phone || '',
            subject_name: selectedSubject.subject_name,
            price: calculatePrice(),
            date: format(selectedDate, 'yyyy-MM-dd'),
            start_time: selectedTime,
            status: 'scheduled'
          }
        });
      } catch (webhookError) {
        console.error('Error notificando a n8n:', webhookError);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error al crear la reserva. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Reserva de Clase</DialogTitle>
          <DialogDescription>
            Crea una reserva manualmente seleccionando alumno, asignatura y horario
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Progress Steps */}
            <div className="flex items-center gap-2 md:gap-4">
              {[
                { num: 1, label: 'Alumno' },
                { num: 2, label: 'Asignatura' },
                { num: 3, label: 'Fecha y Hora' },
                { num: 4, label: 'Confirmar' }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => s.num < step && setStep(s.num)}
                    disabled={s.num > step}
                    className={`flex items-center gap-2 ${
                      s.num <= step ? 'text-[#41f2c0]' : 'text-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      s.num < step 
                        ? 'bg-[#41f2c0] text-white'
                        : s.num === step
                          ? 'border-2 border-[#41f2c0] text-[#41f2c0]'
                          : 'border-2 border-gray-200 text-gray-300'
                    }`}>
                      {s.num < step ? <Check size={14} /> : s.num}
                    </div>
                    <span className="text-sm font-medium hidden md:block">{s.label}</span>
                  </button>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 ${
                      s.num < step ? 'bg-[#41f2c0]' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Select Student */}
            {step === 1 && (
              <div>
                <Label>Selecciona un alumno</Label>
                {students.length > 0 ? (
                  <Select value={selectedStudent} onValueChange={(val) => {
                    setSelectedStudent(val);
                    setStep(2);
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Elige un alumno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            <span>{student.full_name}</span>
                            <span className="text-xs text-gray-500">({student.user_email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">No tienes alumnos asignados aún</p>
                )}
              </div>
            )}

            {/* Step 2: Select Subject */}
            {step === 2 && selectedStudent && (
              <div>
                <Label>Selecciona la asignatura</Label>
                {availableSubjects.length > 0 ? (
                  <Select value={selectedSubject?.subject_id} onValueChange={(val) => {
                    const subject = availableSubjects.find(s => s.subject_id === val);
                    setSelectedSubject(subject);
                    setStep(3);
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Elige una asignatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((subject) => (
                        <SelectItem key={subject.subject_id} value={subject.subject_id}>
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} />
                            <span>{subject.subject_name}</span>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{subject.level}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">Este alumno no te ha asignado ninguna asignatura</p>
                )}
                <Button variant="outline" onClick={() => setStep(1)} className="mt-4">
                  Volver
                </Button>
              </div>
            )}

            {/* Step 3: Select Date & Time */}
            {step === 3 && (
              <div>
                <h3 className="font-medium mb-4">Selecciona fecha y hora</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <BookingCalendar
                      availableSlots={availableSlots}
                      existingBookings={existingBookings}
                      onSelectSlot={handleSlotSelect}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                    />
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={18} className="text-[#41f2c0]" />
                      <h4 className="font-medium">Horarios Disponibles</h4>
                    </div>
                    
                    {selectedDate ? (
                      <>
                        <p className="text-sm text-gray-500 mb-3 capitalize">
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </p>
                        {availableSlots[format(selectedDate, 'yyyy-MM-dd')]?.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                            {availableSlots[format(selectedDate, 'yyyy-MM-dd')].map((slot) => (
                              <Button
                                key={slot}
                                variant={selectedTime === slot ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSlotSelect(selectedDate, slot)}
                                className={cn(
                                  "w-full justify-center",
                                  selectedTime === slot
                                    ? "bg-[#41f2c0] hover:bg-[#35d4a7]"
                                    : "hover:border-[#41f2c0]"
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
                        Selecciona una fecha
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Volver
                  </Button>
                  {selectedDate && selectedTime && (
                    <Button onClick={() => setStep(4)} className="bg-[#41f2c0] hover:bg-[#35d4a7]">
                      Continuar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div>
                <h3 className="font-medium mb-4">Confirmar Reserva</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Alumno</p>
                      <p className="font-medium">{students.find(s => s.id === selectedStudent)?.full_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <BookOpen className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Asignatura</p>
                      <p className="font-medium">{selectedSubject?.subject_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Fecha y Hora</p>
                      <p className="font-medium capitalize">
                        {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        {' · '}
                        {selectedTime} - {calculateEndTime(selectedTime, duration)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[#41f2c0]/10 rounded-lg">
                    <div className="text-[#41f2c0] font-bold text-xl">€</div>
                    <div>
                      <p className="text-xs text-gray-500">Precio</p>
                      <p className="font-bold text-[#41f2c0]">{calculatePrice().toFixed(2)}€</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Volver
                  </Button>
                  <Button
                    onClick={handleConfirmBooking}
                    disabled={saving}
                    className="bg-[#41f2c0] hover:bg-[#35d4a7] flex-1"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Check size={18} className="mr-2" />
                        Confirmar Reserva
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}