import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  precioClase,
  daIndividual,
  daGrupal,
  grupoIndefinido,
  maxAlumnosGrupo,
} from '@/lib/asignaturas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, User, Users, BookOpen, Loader2, Check } from 'lucide-react';
import { format, addDays, getDay, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import BookingCalendar from '../booking/BookingCalendar';
import { cn } from '@/lib/utils';

/**
 * Crear una clase desde el panel del profesor.
 *
 * El orden es Asignatura -> Tipo -> Alumnos. Antes empezaba por el alumno y la asignatura salia
 * de lo que ese alumno tenia asignado, sin posibilidad de elegir individual o grupal: el profesor
 * solo podia crear clases individuales. Se pregunta la asignatura primero porque el tipo depende
 * de ella: un mismo profesor puede dar Matematicas en grupo y Fisica solo individual.
 */
export default function CreateBookingDialog({ open, onOpenChange, teacher, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [classType, setClassType] = useState(null); // 'individual' | 'group'
  const [selectedStudent, setSelectedStudent] = useState(null);     // individual
  const [selectedStudentIds, setSelectedStudentIds] = useState([]); // grupal
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
      setSelectedSubject(null);
      setClassType(null);
      setSelectedStudent(null);
      setSelectedStudentIds([]);
      setSelectedDate(null);
      setSelectedTime(null);
    }
  }, [open, teacher]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsRes = await base44.functions.invoke('studentsOfTeacher', {});
      const allStudents = studentsRes.data?.students || [];
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

  // Asignaturas del profesor que se pueden dar de alguna forma. Se leen de su ficha y no de lo
  // que tenga asignado el alumno: la ficha es la que lleva los precios y el tipo de clase, y
  // asi no se ofrece una asignatura que el profesor ya ha borrado.
  const asignaturasDelProfesor = useMemo(
    () => (teacher?.subjects || []).filter(s => daIndividual(s) || daGrupal(s)),
    [teacher]
  );

  const tiposAsignatura = useMemo(() => ({
    individual: daIndividual(selectedSubject),
    group: daGrupal(selectedSubject),
  }), [selectedSubject]);

  const topeGrupo = useMemo(() => maxAlumnosGrupo(selectedSubject), [selectedSubject]);

  // Alumnos que tienen asignada esa asignatura con este profesor. El nivel se compara solo si
  // la asignacion lo trae: las asignaciones antiguas se guardaron sin nivel y si no se fuera
  // tolerante no saldria ningun alumno.
  const alumnosDeLaAsignatura = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter(st => (st.assigned_teachers || []).some(at =>
      at.teacher_id === teacher.id
      && at.subject_id === selectedSubject.subject_id
      && (!at.level || !selectedSubject.level || at.level === selectedSubject.level)
    ));
  }, [students, selectedSubject, teacher]);

  const alumnosElegidos = useMemo(() => {
    if (classType === 'group') {
      return selectedStudentIds.map(id => students.find(s => s.id === id)).filter(Boolean);
    }
    const uno = students.find(s => s.id === selectedStudent);
    return uno ? [uno] : [];
  }, [classType, selectedStudentIds, selectedStudent, students]);

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

    // Generate slots for 90 days back and 30 days forward
    const now = new Date();
    const minDate = addDays(now, -90);

    for (let i = 0; i < 120; i++) {
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

  // Precio POR ALUMNO. En grupal depende de cuantos haya dentro, asi que se calcula con los
  // alumnos ya elegidos.
  const calculatePrice = () => {
    if (!selectedSubject) return 0;
    return precioClase(selectedSubject, {
      tipo: classType === 'group' ? 'group' : 'individual',
      duracionMinutos: duration,
      numAlumnos: classType === 'group' ? Math.max(alumnosElegidos.length, 1) : 1,
    });
  };

  const handleSlotSelect = (date, time) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const alternarAlumno = (id) => {
    setSelectedStudentIds(previos => {
      if (previos.includes(id)) return previos.filter(x => x !== id);
      // topeGrupo null significa grupo indefinido: no hay limite que respetar.
      if (topeGrupo !== null && previos.length >= topeGrupo) return previos;
      return [...previos, id];
    });
  };

  const puedeSeguirConAlumnos = classType === 'group'
    ? selectedStudentIds.length >= 1
    : Boolean(selectedStudent);

  const handleConfirmBooking = async () => {
    setSaving(true);
    try {
      const esGrupo = classType === 'group';
      const alumnos = alumnosElegidos;
      if (alumnos.length === 0) throw new Error('No hay alumnos seleccionados');

      const fechaStr = format(selectedDate, 'yyyy-MM-dd');
      const horaFin = calculateEndTime(selectedTime, duration);
      const precio = calculatePrice();
      const yaPasada = isBefore(new Date(`${fechaStr}T${horaFin}`), new Date());

      // En el plan sin cuota Menttio retiene su parte de cada clase. Faltaba en este dialogo:
      // las clases que el profesor creaba a mano se guardaban sin comision.
      const esComision = teacher.subscription_plan === 'commission';
      const pct = teacher.commission_percentage ?? 10;
      const camposComision = esComision
        ? {
            platform_fee: parseFloat((precio * pct / 100).toFixed(2)),
            teacher_payout: parseFloat((precio * (1 - pct / 100)).toFixed(2)),
          }
        : {};

      const comun = {
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        teacher_email: teacher.user_email,
        teacher_phone: teacher.phone || '',
        subject_id: selectedSubject.subject_id,
        subject_name: selectedSubject.subject_name,
        date: fechaStr,
        start_time: selectedTime,
        end_time: horaFin,
        duration_minutes: duration,
        price: precio,
        status: yaPasada ? 'completed' : 'scheduled',
        payment_status: 'pending',
        files: [],
        ...camposComision,
      };

      const newBooking = await base44.entities.Booking.create(esGrupo
        ? {
            ...comun,
            class_type: 'group',
            max_students: topeGrupo,
            group_unlimited: topeGrupo === null,
            enrolled_students: alumnos.map(a => ({
              student_id: a.id,
              student_name: a.full_name,
              student_email: a.user_email,
              payment_status: 'pending',
            })),
          }
        : {
            ...comun,
            class_type: 'individual',
            student_id: alumnos[0].id,
            student_name: alumnos[0].full_name,
            student_email: alumnos[0].user_email,
            student_phone: alumnos[0].phone || '',
          });

      // Create notifications
      const bookingDate = format(selectedDate, "d 'de' MMMM", { locale: es });
      const queClase = esGrupo ? 'clase grupal' : 'clase';

      for (const alumno of alumnos) {
        await base44.entities.Notification.create({
          user_id: alumno.id,
          user_email: alumno.user_email,
          type: 'booking_new',
          title: esGrupo ? 'Clase grupal reservada' : 'Clase reservada',
          message: `${teacher.full_name} ha reservado una ${queClase} de ${selectedSubject.subject_name} contigo para el ${bookingDate} a las ${selectedTime}`,
          related_id: newBooking.id,
          link_page: 'MyClasses'
        });
      }

      await base44.entities.Notification.create({
        user_id: teacher.id,
        user_email: teacher.user_email,
        type: 'booking_new',
        title: esGrupo ? 'Clase grupal creada' : 'Clase creada',
        message: esGrupo
          ? `Has creado una clase grupal de ${selectedSubject.subject_name} con ${alumnos.length} alumnos para el ${bookingDate} a las ${selectedTime}`
          : `Has creado una clase de ${selectedSubject.subject_name} con ${alumnos[0].full_name} para el ${bookingDate} a las ${selectedTime}`,
        related_id: newBooking.id,
        link_page: 'TeacherCalendar'
      });

      // Send push notification to students
      for (const alumno of alumnos) {
        try {
          await base44.functions.invoke('sendPushNotification', {
            userEmail: alumno.user_email,
            title: esGrupo ? 'Nueva clase grupal reservada' : 'Nueva clase reservada',
            body: `${teacher.full_name} ha reservado una ${queClase} de ${selectedSubject.subject_name} contigo para el ${bookingDate} a las ${selectedTime}`,
            data: {
              booking_id: newBooking.id,
              page: 'MyClasses'
            }
          });
        } catch (pushError) {
          console.error('Error enviando push notification:', pushError);
        }
      }

      // Sync with Google Calendar.
      //
      // En grupal solo se sincroniza el calendario del profesor. La reserva guarda un unico
      // google_event_id_student, asi que crear un evento por alumno dejaria eventos huerfanos
      // que luego no se podrian mover ni borrar al cambiar o cancelar la clase. Los alumnos la
      // ven en la app y reciben notificacion y aviso push.
      try {
        if (teacher.google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', {
            bookingId: newBooking.id,
            userType: 'teacher',
            userEmail: teacher.user_email
          });
        }
        if (!esGrupo && alumnos[0].google_calendar_connected) {
          await base44.functions.invoke('syncGoogleCalendar', {
            bookingId: newBooking.id,
            userType: 'student',
            userEmail: alumnos[0].user_email
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
            class_type: esGrupo ? 'group' : 'individual',
            student_id: esGrupo ? null : alumnos[0].id,
            student_name: esGrupo ? alumnos.map(a => a.full_name).join(', ') : alumnos[0].full_name,
            student_email: esGrupo ? alumnos.map(a => a.user_email).join(', ') : alumnos[0].user_email,
            student_phone: esGrupo ? '' : (alumnos[0].phone || ''),
            teacher_name: teacher.full_name,
            teacher_email: teacher.user_email,
            teacher_phone: teacher.phone || '',
            subject_name: selectedSubject.subject_name,
            price: precio,
            date: fechaStr,
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

  const pasos = [
    { num: 1, label: 'Asignatura' },
    { num: 2, label: 'Tipo' },
    { num: 3, label: classType === 'group' ? 'Alumnos' : 'Alumno' },
    { num: 4, label: 'Fecha y Hora' },
    { num: 5, label: 'Confirmar' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Reserva de Clase</DialogTitle>
          <DialogDescription>
            Crea una reserva manualmente seleccionando asignatura, tipo de clase, alumnos y horario
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1">
              {pasos.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => s.num < step && setStep(s.num)}
                    disabled={s.num > step}
                    className={`flex items-center gap-2 flex-shrink-0 ${
                      s.num <= step ? 'text-[#41f2c0]' : 'text-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      s.num < step
                        ? 'bg-[#41f2c0] text-[#404040]'
                        : s.num === step
                          ? 'border-2 border-[#41f2c0] text-[#41f2c0]'
                          : 'border-2 border-gray-200 text-gray-300'
                    }`}>
                      {s.num < step ? <Check size={14} /> : s.num}
                    </div>
                    <span className="text-sm font-medium hidden md:block whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < pasos.length - 1 && (
                    <div className={`flex-1 h-0.5 min-w-4 ${
                      s.num < step ? 'bg-[#41f2c0]' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Asignatura */}
            {step === 1 && (
              <div>
                <Label>Selecciona la asignatura</Label>
                {asignaturasDelProfesor.length > 0 ? (
                  <Select
                    value={selectedSubject ? `${selectedSubject.subject_id}|${selectedSubject.level || ''}` : undefined}
                    onValueChange={(val) => {
                      const [id, nivel] = val.split('|');
                      const asignatura = asignaturasDelProfesor.find(
                        s => s.subject_id === id && (s.level || '') === nivel
                      );
                      setSelectedSubject(asignatura);
                      // Cambiar de asignatura invalida el tipo y los alumnos elegidos.
                      setClassType(null);
                      setSelectedStudent(null);
                      setSelectedStudentIds([]);
                      setStep(2);
                    }}
                  >
                    <SelectTrigger aria-label="Selecciona la asignatura" className="mt-2">
                      <SelectValue placeholder="Elige una asignatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {asignaturasDelProfesor.map((subject) => (
                        <SelectItem
                          key={`${subject.subject_id}|${subject.level || ''}`}
                          value={`${subject.subject_id}|${subject.level || ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen size={16} />
                            <span>{subject.subject_name}</span>
                            {subject.level && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{subject.level}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">
                    No tienes asignaturas configuradas. Añádelas en "Mis Asignaturas" para poder crear clases.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Tipo de clase */}
            {step === 2 && selectedSubject && (
              <div>
                <Label>¿Individual o grupal?</Label>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Esto es lo que tienes configurado en {selectedSubject.subject_name}
                  {selectedSubject.level ? ` de ${selectedSubject.level}` : ''}.
                </p>
                <div className="grid gap-3">
                  {tiposAsignatura.individual && (
                    <button
                      onClick={() => { setClassType('individual'); setSelectedStudentIds([]); setStep(3); }}
                      className="p-4 rounded-xl border-2 text-left transition-all hover:border-[#41f2c0] border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#41f2c0]/10 flex items-center justify-center flex-shrink-0">
                          <User className="text-[#41f2c0]" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#404040]">Clase individual</p>
                          <p className="text-xs text-gray-500">
                            Un alumno · {precioClase(selectedSubject, { tipo: 'individual', duracionMinutos: duration }).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {tiposAsignatura.group && (
                    <button
                      onClick={() => { setClassType('group'); setSelectedStudent(null); setStep(3); }}
                      className="p-4 rounded-xl border-2 text-left transition-all hover:border-purple-400 border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Users className="text-purple-500" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#404040]">Clase grupal</p>
                          <p className="text-xs text-gray-500">
                            {grupoIndefinido(selectedSubject)
                              ? `Sin límite de alumnos · ${precioClase(selectedSubject, { tipo: 'group', duracionMinutos: duration, numAlumnos: 1 }).toFixed(2)}€ por alumno`
                              : `Hasta ${topeGrupo} alumnos · el precio por alumno baja según cuántos entren`}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setStep(1)} className="mt-4">
                  Volver
                </Button>
              </div>
            )}

            {/* Step 3: Alumno o alumnos */}
            {step === 3 && selectedSubject && classType && (
              <div>
                {classType === 'group' ? (
                  <>
                    <Label>Selecciona los alumnos</Label>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      {topeGrupo === null
                        ? 'Sin límite de alumnos en esta asignatura.'
                        : `Máximo ${topeGrupo} alumnos.`}
                      {' '}Seleccionados: {selectedStudentIds.length}
                    </p>
                    {alumnosDeLaAsignatura.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {alumnosDeLaAsignatura.map((st) => {
                          const marcado = selectedStudentIds.includes(st.id);
                          const tope = topeGrupo !== null && !marcado && selectedStudentIds.length >= topeGrupo;
                          return (
                            <label
                              key={st.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                                tope ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-purple-300',
                                marcado ? 'border-purple-400 bg-purple-50' : 'border-gray-200'
                              )}
                            >
                              <Checkbox
                                checked={marcado}
                                disabled={tope}
                                onCheckedChange={() => alternarAlumno(st.id)}
                                aria-label={st.full_name}
                              />
                              <User size={16} className="text-gray-400" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#404040] truncate">{st.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">{st.user_email}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mt-2">
                        Ningún alumno tiene asignada esta asignatura contigo todavía.
                      </p>
                    )}
                    {selectedStudentIds.length > 0 && (
                      <p className="text-xs text-purple-700 mt-3">
                        Con {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'alumno' : 'alumnos'}:
                        {' '}{calculatePrice().toFixed(2)}€ por alumno
                        {' · '}{(calculatePrice() * selectedStudentIds.length).toFixed(2)}€ en total
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Label>Selecciona un alumno</Label>
                    {alumnosDeLaAsignatura.length > 0 ? (
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger aria-label="Selecciona un alumno" className="mt-2">
                          <SelectValue placeholder="Elige un alumno" />
                        </SelectTrigger>
                        <SelectContent>
                          {alumnosDeLaAsignatura.map((student) => (
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
                      <p className="text-gray-500 text-sm mt-2">
                        Ningún alumno tiene asignada esta asignatura contigo todavía.
                      </p>
                    )}
                  </>
                )}

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Volver
                  </Button>
                  {puedeSeguirConAlumnos && (
                    <Button onClick={() => setStep(4)} className="bg-[#41f2c0] hover:bg-[#35d4a7]">
                      Continuar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Select Date & Time */}
            {step === 4 && (
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
                      allowPast={true}
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
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Volver
                  </Button>
                  {selectedDate && selectedTime && (
                    <Button onClick={() => setStep(5)} className="bg-[#41f2c0] hover:bg-[#35d4a7]">
                      Continuar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div>
                <h3 className="font-medium mb-4">Confirmar Reserva</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <BookOpen className="text-[#41f2c0]" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Asignatura</p>
                      <p className="font-medium">
                        {selectedSubject?.subject_name}
                        {selectedSubject?.level ? ` · ${selectedSubject.level}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {classType === 'group'
                      ? <Users className="text-purple-500" size={20} />
                      : <User className="text-[#41f2c0]" size={20} />}
                    <div>
                      <p className="text-xs text-gray-500">
                        {classType === 'group' ? `Clase grupal · ${alumnosElegidos.length} alumnos` : 'Clase individual'}
                      </p>
                      <p className="font-medium">
                        {alumnosElegidos.map(a => a.full_name).join(', ')}
                      </p>
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
                      <p className="text-xs text-gray-500">
                        {classType === 'group' ? 'Precio por alumno' : 'Precio'}
                      </p>
                      <p className="font-bold text-[#41f2c0]">
                        {calculatePrice().toFixed(2)}€
                        {classType === 'group' && alumnosElegidos.length > 1 && (
                          <span className="text-sm font-normal text-gray-500">
                            {' · '}{(calculatePrice() * alumnosElegidos.length).toFixed(2)}€ en total
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {classType === 'group' && (
                    <p className="text-xs text-gray-500 px-1">
                      La clase les aparece en la app y reciben aviso. En las clases grupales el
                      evento solo se crea en tu Google Calendar, no en el de cada alumno.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
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
