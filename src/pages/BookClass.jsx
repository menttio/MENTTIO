import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  User, 
  Clock, 
  DollarSign,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, addDays, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import BookingCalendar from '../components/booking/BookingCalendar';
import TeacherCard from '../components/student/TeacherCard';

export default function BookClass() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const duration = 60; // Fixed 1 hour duration
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        
        const students = await base44.entities.Student.filter({ user_email: user.email });
        if (students.length > 0) {
          setStudent(students[0]);
        }
        
        const allSubjects = await base44.entities.Subject.list();
        setSubjects(allSubjects);
        
        const allTeachers = await base44.entities.Teacher.list();
        setTeachers(allTeachers);

        const allAvailabilities = await base44.entities.Availability.list();
        setAvailabilities(allAvailabilities);

        const allBookings = await base44.entities.Booking.filter({ status: 'scheduled' });
        setExistingBookings(allBookings);

        // Load Google Calendar events if teacher has it connected
        setGoogleCalendarEvents([]);
        
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Get unique subjects from assigned teachers (only those that still exist in teacher's subjects)
  const availableSubjects = useMemo(() => {
    if (!student?.assigned_teachers?.length) return [];
    
    const subjectMap = new Map();
    student.assigned_teachers.forEach(at => {
      // Verify the teacher still has this subject
      const teacher = teachers.find(t => t.id === at.teacher_id);
      const teacherStillHasSubject = teacher?.subjects?.some(s => s.subject_id === at.subject_id);
      
      if (teacherStillHasSubject && !subjectMap.has(at.subject_id)) {
        // Get subject name from subjects array for reliability
        const subjectInfo = subjects.find(s => s.id === at.subject_id);
        subjectMap.set(at.subject_id, {
          id: at.subject_id,
          name: subjectInfo?.name || at.subject_name
        });
      }
    });
    
    return Array.from(subjectMap.values());
  }, [student, teachers, subjects]);

  // Get teachers for selected subject - ONLY from assigned teachers
  const teachersForSubject = useMemo(() => {
    if (!selectedSubject || !student?.assigned_teachers?.length) return [];
    
    // Get the specific assigned teachers for this subject
    const assignedForSubject = student.assigned_teachers.filter(
      at => at.subject_id === selectedSubject
    );
    
    // Map to actual teacher objects, filtering out any that don't exist or don't teach the subject
    return assignedForSubject
      .map(at => teachers.find(t => t.id === at.teacher_id))
      .filter(teacher => {
        if (!teacher) return false;
        // Verify teacher still teaches this subject
        return teacher.subjects?.some(s => s.subject_id === selectedSubject);
      });
  }, [selectedSubject, student, teachers]);

  // Helper function to generate slots every 30 minutes from time ranges
  const generateHourlySlots = (timeSlots) => {
    const allSlots = [];

    timeSlots.forEach(slot => {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        allSlots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
        currentMin += 30; // Generate slots every 30 minutes
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour++;
        }
      }
    });

    return allSlots;
  };

  // Load Google Calendar events when teacher is selected
  useEffect(() => {
    const loadGoogleEvents = async () => {
      if (!selectedTeacher?.google_calendar_connected) return;

      try {
        const now = new Date();
        const endDate = addDays(now, 30);

        const response = await base44.functions.invoke('getGoogleCalendarEvents', {
          startDate: format(now, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          userType: 'teacher',
          userEmail: selectedTeacher.user_email
        });

        setGoogleCalendarEvents(response.data.events || []);
      } catch (error) {
        console.error('Error loading Google Calendar events:', error);
      }
    };

    loadGoogleEvents();
  }, [selectedTeacher]);

  // Calculate available slots for selected teacher
  const availableSlots = useMemo(() => {
    if (!selectedTeacher) return {};
    
    const slots = {};
    const teacherAvailability = availabilities.filter(a => a.teacher_id === selectedTeacher.id);
    const teacherBookings = existingBookings.filter(b => b.teacher_id === selectedTeacher.id);
    
    // Generate slots for next 30 days, starting from tomorrow
    const now = new Date();
    const minDate = addDays(now, 1);
    for (let i = 0; i < 30; i++) {
      const date = addDays(minDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);
      
      // Check for exception first
      const exception = teacherAvailability.find(
        a => a.type === 'exception' && a.specific_date === dateStr
      );
      
      if (exception) {
        if (exception.is_unavailable) continue;
        slots[dateStr] = generateHourlySlots(exception.time_slots || []);
      } else {
        // Use regular schedule
        const regular = teacherAvailability.find(
          a => a.type === 'regular' && a.day_of_week === dayOfWeek
        );
        if (regular && regular.time_slots) {
          slots[dateStr] = generateHourlySlots(regular.time_slots);
        }
      }
      
      // Filter out already booked slots considering 1-hour class duration
      if (slots[dateStr]) {
        const blockedSlots = new Set();
        
        // Block slots based on existing bookings
        teacherBookings
          .filter(b => b.date === dateStr)
          .forEach(booking => {
            const [bookingHour, bookingMin] = booking.start_time.split(':').map(Number);
            const [bookingEndHour, bookingEndMin] = booking.end_time.split(':').map(Number);
            
            // Block all slots where a new 1-hour class would overlap
            slots[dateStr]?.forEach(slot => {
              const [slotHour, slotMin] = slot.split(':').map(Number);
              
              // New class would start at slotHour:slotMin and end 60 minutes later
              const newClassStart = slotHour * 60 + slotMin;
              const newClassEnd = newClassStart + 60;
              
              // Existing booking time in minutes
              const bookingStart = bookingHour * 60 + bookingMin;
              const bookingEnd = bookingEndHour * 60 + bookingEndMin;
              
              // Check if they overlap: newClassStart < bookingEnd AND newClassEnd > bookingStart
              if (newClassStart < bookingEnd && newClassEnd > bookingStart) {
                blockedSlots.add(slot);
              }
            });
          });

        // Filter out Google Calendar busy slots considering 1-hour class duration
        const eventsForDay = googleCalendarEvents.filter(e => {
          if (!e.start || !e.end) return false;
          const eventDate = format(parseISO(e.start), 'yyyy-MM-dd');
          return eventDate === dateStr;
        });

        eventsForDay.forEach(e => {
            const eventStart = parseISO(e.start);
            const eventEnd = parseISO(e.end);

            // Block all slots where a 1-hour class would overlap with the event
            slots[dateStr]?.forEach(slot => {
              const [slotHour, slotMin] = slot.split(':').map(Number);

              // Create slot start time on the same date
              const slotStart = new Date(dateStr);
              slotStart.setHours(slotHour, slotMin, 0, 0);

              // Calculate when a class starting at this slot would end (1 hour duration)
              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotEnd.getMinutes() + 60);

              // Block if a 1-hour class starting at this slot overlaps with the event
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
    }, [selectedTeacher, availabilities, existingBookings, googleCalendarEvents]);

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

  const calculatePrice = () => {
    if (!selectedTeacher || !selectedSubject) return 0;
    const subjectInfo = selectedTeacher.subjects?.find(s => s.subject_id === selectedSubject);
    if (!subjectInfo) return 0;
    return (subjectInfo.price_per_hour * duration) / 60;
  };

  const handleConfirmBooking = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || availableSubjects.find(s => s.id === selectedSubject)?.name;

      // Create booking with teacher and student phone
      const newBooking = await base44.entities.Booking.create({
        student_id: student.id,
        student_name: student.full_name,
        student_email: user.email,
        student_phone: student.phone || '',
        teacher_id: selectedTeacher.id,
        teacher_name: selectedTeacher.full_name,
        teacher_email: selectedTeacher.user_email,
        teacher_phone: selectedTeacher.phone || '',
        subject_id: selectedSubject,
        subject_name: subjectName,
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
        user_id: student.id,
        user_email: user.email,
        type: 'booking_new',
        title: 'Clase reservada',
        message: `Has reservado una clase de ${subjectName} con ${selectedTeacher.full_name} para el ${bookingDate} a las ${selectedTime}. Recuerda pagar después de la clase.`,
        related_id: newBooking.id,
        link_page: 'MyClasses'
      });

      await base44.entities.Notification.create({
        user_id: selectedTeacher.id,
        user_email: selectedTeacher.user_email,
        type: 'booking_new',
        title: 'Nueva reserva de clase',
        message: `${student.full_name} ha reservado una clase de ${subjectName} para el ${bookingDate} a las ${selectedTime}`,
        related_id: newBooking.id,
        link_page: 'TeacherCalendar'
      });

      // Send push notification to teacher
      try {
        await base44.functions.invoke('sendPushNotification', {
          userEmail: selectedTeacher.user_email,
          title: 'Nueva reserva de clase',
          body: `${student.full_name} ha reservado una clase de ${subjectName} para el ${bookingDate} a las ${selectedTime}`,
          data: {
            booking_id: newBooking.id,
            page: 'TeacherCalendar'
          }
        });
      } catch (pushError) {
        console.error('Error enviando push notification:', pushError);
      }

      // Sync with Google Calendar for both teacher and student
      try {
        if (selectedTeacher.google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: newBooking.id,
            userType: 'teacher',
            userEmail: selectedTeacher.user_email
          });
        }
        if (student.google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', { 
            bookingId: newBooking.id,
            userType: 'student',
            userEmail: user.email
          });
        }
      } catch (syncError) {
        console.error('Error syncing with Google Calendar:', syncError);
      }

      // Notificar a n8n
      try {
        await base44.functions.invoke('notifyN8N', {
          bookingData: {
            booking_id: newBooking.id,
            student_id: student.id,
            student_name: student.full_name,
            student_email: user.email,
            student_phone: student.phone || '',
            teacher_name: selectedTeacher.full_name,
            teacher_email: selectedTeacher.user_email,
            teacher_phone: selectedTeacher.phone || '',
            subject_name: subjectName,
            price: calculatePrice(),
            date: format(selectedDate, 'yyyy-MM-dd'),
            start_time: selectedTime,
            status: 'scheduled'
          }
        });
      } catch (webhookError) {
        console.error('Error notificando a n8n:', webhookError);
        // No bloqueamos la reserva si falla el webhook
      }

      navigate(createPageUrl('MyClasses'));
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error al crear la reserva. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !subjects.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  if (!student?.assigned_teachers?.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="mx-auto text-orange-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-[#404040] mb-2">No tienes profesores asignados</h2>
        <p className="text-gray-500 mb-6">
          Para reservar clases, primero debes buscar y añadir profesores a tu lista.
        </p>
        <Button 
          onClick={() => navigate(createPageUrl('SearchTeachers'))}
          className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
        >
          Buscar Profesores
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Reservar Clase</h1>
        <p className="text-gray-500 mt-2 text-sm">Selecciona asignatura, profesor y horario</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 md:gap-4 mb-8 overflow-x-auto pb-2">
        {[
          { num: 1, label: 'Asignatura' },
          { num: 2, label: 'Profesor' },
          { num: 3, label: 'Fecha y Hora' },
          { num: 4, label: 'Confirmar' }
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => s.num < step && setStep(s.num)}
              disabled={s.num > step}
              className={`flex items-center gap-1 md:gap-2 flex-shrink-0 ${
                s.num <= step ? 'text-[#41f2c0]' : 'text-gray-300'
              }`}
            >
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold ${
                s.num < step 
                  ? 'bg-[#41f2c0] text-white'
                  : s.num === step
                    ? 'border-2 border-[#41f2c0] text-[#41f2c0]'
                    : 'border-2 border-gray-200 text-gray-300'
              }`}>
                {s.num < step ? <Check size={14} /> : s.num}
              </div>
              <span className="hidden md:block text-xs md:text-sm font-medium whitespace-nowrap">{s.label}</span>
            </button>
            {idx < 3 && (
              <div className={`flex-1 min-w-[20px] h-0.5 ${
                s.num < step ? 'bg-[#41f2c0]' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Select Subject */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-[#404040] mb-4">
                  ¿Qué asignatura quieres estudiar?
                </h2>
                <div className="grid gap-3">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => {
                        setSelectedSubject(subject.id);
                        setSelectedTeacher(null);
                        setStep(2);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all hover:border-[#41f2c0] hover:shadow-md ${
                        selectedSubject === subject.id 
                          ? 'border-[#41f2c0] bg-[#41f2c0]/5' 
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#41f2c0]/10 flex items-center justify-center">
                          <BookOpen className="text-[#41f2c0]" size={20} />
                        </div>
                        <span className="font-medium text-[#404040]">{subject.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Select Teacher */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[#404040]">
                    Elige tu profesor
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-gray-500"
                  >
                    <ChevronLeft size={18} className="mr-1" />
                    Volver
                  </Button>
                </div>

                {teachersForSubject.length > 0 ? (
                  <div className="grid gap-4">
                    {teachersForSubject.map((teacher) => (
                      <button
                        key={teacher.id}
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setStep(3);
                        }}
                        className="w-full text-left"
                      >
                        <TeacherCard 
                          teacher={teacher}
                          selectedSubject={selectedSubject}
                          showActions={false}
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay profesores asignados para esta asignatura
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#404040]">
                Selecciona fecha y hora
              </h2>
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-gray-500"
              >
                <ChevronLeft size={18} className="mr-1" />
                Volver
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 w-full overflow-x-auto">
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
                          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <Button
                  onClick={() => setStep(4)}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6"
                >
                  Continuar
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#404040]">
                    Confirmar Reserva
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="text-gray-500"
                  >
                    <ChevronLeft size={18} className="mr-1" />
                    Volver
                  </Button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <BookOpen className="text-[#41f2c0]" size={24} />
                    <div>
                      <p className="text-sm text-gray-500">Asignatura</p>
                      <p className="font-semibold text-[#404040]">
                        {availableSubjects.find(s => s.id === selectedSubject)?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <User className="text-[#41f2c0]" size={24} />
                    <div>
                      <p className="text-sm text-gray-500">Profesor</p>
                      <p className="font-semibold text-[#404040]">{selectedTeacher?.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Clock className="text-[#41f2c0]" size={24} />
                    <div>
                      <p className="text-sm text-gray-500">Fecha y Hora</p>
                      <p className="font-semibold text-[#404040] capitalize">
                        {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        {' · '}
                        {selectedTime} - {calculateEndTime(selectedTime, duration)}
                        {' '}({duration} min)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-[#41f2c0]/10 rounded-xl">
                    <DollarSign className="text-[#41f2c0]" size={24} />
                    <div>
                      <p className="text-sm text-gray-500">Precio</p>
                      <p className="font-bold text-2xl text-[#41f2c0]">{calculatePrice().toFixed(2)}€</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConfirmBooking}
                  disabled={saving}
                  className="w-full bg-[#41f2c0] hover:bg-[#35d4a7] text-white py-5 md:py-6 text-base md:text-lg"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Check size={20} className="mr-2" />
                      Confirmar Reserva
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  💡 El pago se realizará después de finalizar la clase
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}