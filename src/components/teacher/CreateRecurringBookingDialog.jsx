import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, BookOpen, Loader2, Check, Plus, X, Repeat, Calendar, AlertTriangle } from 'lucide-react';
import { format, addDays, addWeeks, getDay, nextDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { label: 'Lun', value: 1, fullLabel: 'Lunes' },
  { label: 'Mar', value: 2, fullLabel: 'Martes' },
  { label: 'Mié', value: 3, fullLabel: 'Miércoles' },
  { label: 'Jue', value: 4, fullLabel: 'Jueves' },
  { label: 'Vie', value: 5, fullLabel: 'Viernes' },
  { label: 'Sáb', value: 6, fullLabel: 'Sábado' },
  { label: 'Dom', value: 0, fullLabel: 'Domingo' },
];

const TIME_SLOTS = [];
for (let h = 6; h < 23; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}

// dayValue: 0=Dom,1=Lun,...,6=Sáb (JS getDay())
function getNextDateForDay(dayValue) {
  const today = new Date();
  const todayDay = getDay(today); // 0=Dom
  let daysToAdd = (dayValue - todayDay + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // Start from next week if today matches
  return addDays(today, daysToAdd);
}

function calculateEndTime(startTime, durationMinutes = 60) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

export default function CreateRecurringBookingDialog({ open, onOpenChange, teacher, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Recurrence config: array of { day: number, time: string }
  const [recurrenceRules, setRecurrenceRules] = useState([]);
  const [addingDay, setAddingDay] = useState(null);
  const [addingTime, setAddingTime] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [existingBookings, setExistingBookings] = useState([]);
  const [calendarConflicts, setCalendarConflicts] = useState([]); // clases bloqueadas por Google Calendar tras confirmar
  const [showConflictPopup, setShowConflictPopup] = useState(false);

  const duration = 60;

  useEffect(() => {
    if (open && teacher) {
      loadStudents();
      loadBookings();
    } else {
      setStep(1);
      setSelectedStudent(null);
      setSelectedSubject(null);
      setRecurrenceRules([]);
      setAddingDay(null);
      setAddingTime('');
      setWeeks(4);
    }
  }, [open, teacher]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const allStudents = await base44.entities.Student.list();
      const studentsWithTeacher = allStudents.filter(s =>
        s.assigned_teachers?.some(at => at.teacher_id === teacher.id)
      );
      setStudents(studentsWithTeacher);
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      const studentObj = students.find(s => s.id === selectedStudent);
      const assignments = studentObj?.assigned_teachers?.filter(
        at => at.teacher_id === teacher.id
      ) || [];
      setAvailableSubjects(assignments);
      setSelectedSubject(null);
    }
  }, [selectedStudent, teacher, students]);

  const calculatePrice = () => {
    if (!teacher || !selectedSubject) return 0;
    const subjectInfo = teacher.subjects?.find(s => s.subject_id === selectedSubject.subject_id);
    return subjectInfo ? (subjectInfo.price_per_hour * duration) / 60 : 0;
  };

  const addRule = () => {
    if (addingDay === null || !addingTime) return;
    const already = recurrenceRules.find(r => r.day === addingDay && r.time === addingTime);
    if (!already) {
      setRecurrenceRules(prev => [...prev, { day: addingDay, time: addingTime }]);
    }
    setAddingDay(null);
    setAddingTime('');
  };

  const removeRule = (idx) => {
    setRecurrenceRules(prev => prev.filter((_, i) => i !== idx));
  };

  // Generate all booking dates based on recurrence rules and weeks
  const previewBookings = useMemo(() => {
    if (!recurrenceRules.length || !weeks) return [];
    const result = [];
    const today = new Date();

    for (let w = 0; w < weeks; w++) {
      for (const rule of recurrenceRules) {
        // Get next occurrence of this weekday from today
        let base = getNextDateForDay(rule.day);
        const date = addWeeks(base, w);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Check conflicts with existing bookings
        const conflict = existingBookings.some(b => {
          if (b.date !== dateStr) return false;
          const [bH, bM] = b.start_time.split(':').map(Number);
          const [bEH, bEM] = b.end_time.split(':').map(Number);
          const [rH, rM] = rule.time.split(':').map(Number);
          const rStart = rH * 60 + rM;
          const rEnd = rStart + duration;
          const bStart = bH * 60 + bM;
          const bEnd = bEH * 60 + bEM;
          return rStart < bEnd && rEnd > bStart;
        });

        result.push({
          date,
          dateStr,
          time: rule.time,
          day: rule.day,
          conflict
        });
      }
    }

    return result.sort((a, b) => a.date - b.date);
  }, [recurrenceRules, weeks, existingBookings]);

  const validBookings = previewBookings.filter(b => !b.conflict);
  const conflictCount = previewBookings.filter(b => b.conflict).length;

  const handleConfirm = async () => {
    if (!validBookings.length) return;
    setSaving(true);

    try {
      const studentObj = students.find(s => s.id === selectedStudent);
      const price = calculatePrice();

      // Fetch Google Calendar events for the full range if teacher has it connected
      let googleEvents = [];
      if (teacher.google_calendar_connected && validBookings.length > 0) {
        try {
          const minDate = validBookings[0].dateStr;
          const maxDate = validBookings[validBookings.length - 1].dateStr;
          const resp = await base44.functions.invoke('getGoogleCalendarEvents', {
            startDate: minDate,
            endDate: maxDate,
            userType: 'teacher',
            userEmail: teacher.user_email
          });
          googleEvents = resp.data?.events || [];
        } catch (e) {
          console.error('Error fetching Google Calendar events:', e);
        }
      }

      // Filter out classes that conflict with Google Calendar events
      const hasGoogleConflict = (b) => {
        if (!googleEvents.length) return false;
        const [rH, rM] = b.time.split(':').map(Number);
        const rStart = rH * 60 + rM;
        const rEnd = rStart + duration; // always 60 min

        return googleEvents.some(ev => {
          if (!ev.start || !ev.end) return false;
          // ev.start and ev.end are ISO strings like "2026-03-25T10:00:00"
          const evStartDate = ev.start.substring(0, 10);
          if (evStartDate !== b.dateStr) return false;
          const evStartTime = ev.start.substring(11, 16); // "HH:MM"
          const evEndTime = ev.end.substring(11, 16);
          const [eH, eM] = evStartTime.split(':').map(Number);
          const [eEH, eEM] = evEndTime.split(':').map(Number);
          const eStart = eH * 60 + eM;
          const eEnd = eEH * 60 + eEM;
          return rStart < eEnd && rEnd > eStart;
        });
      };

      const calendarBlocked = validBookings.filter(hasGoogleConflict);
      const bookingsToCreate = validBookings.filter(b => !hasGoogleConflict(b));

      if (bookingsToCreate.length === 0) {
        setCalendarConflicts(calendarBlocked);
        setShowConflictPopup(true);
        setSaving(false);
        return;
      }

      // Create all non-conflicting bookings in parallel (batch)
      const createdBookings = await Promise.all(
        bookingsToCreate.map(b =>
          base44.entities.Booking.create({
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
            date: b.dateStr,
            start_time: b.time,
            end_time: calculateEndTime(b.time, duration),
            duration_minutes: duration,
            price,
            status: 'scheduled',
            payment_status: 'pending',
            files: []
          })
        )
      );

      // Notify n8n for all created bookings in a single bulk call
      try {
        await base44.functions.invoke('notifyN8NBulk', {
          bookings: createdBookings.map(b => ({
            booking_id: b.id,
            student_id: studentObj.id,
            student_name: studentObj.full_name,
            student_email: studentObj.user_email,
            student_phone: studentObj.phone || '',
            teacher_name: teacher.full_name,
            teacher_email: teacher.user_email,
            teacher_phone: teacher.phone || '',
            subject_name: selectedSubject.subject_name,
            price,
            date: b.date,
            start_time: b.start_time,
            status: 'new'
          }))
        });
      } catch (e) {
        console.error('Error notifying n8n bulk:', e);
      }

      // Single notification to student summarizing all classes
      await base44.entities.Notification.create({
        user_id: studentObj.id,
        user_email: studentObj.user_email,
        type: 'booking_new',
        title: 'Clases recurrentes creadas',
        message: `${teacher.full_name} ha programado ${createdBookings.length} clases recurrentes de ${selectedSubject.subject_name} contigo`,
        related_id: createdBookings[0]?.id,
        link_page: 'MyClasses'
      });

      // Sync Google Calendar for teacher
      if (teacher.google_calendar_connected) {
        for (const b of createdBookings) {
          try {
            await base44.functions.invoke('syncGoogleCalendar', {
              bookingId: b.id,
              userType: 'teacher',
              userEmail: teacher.user_email
            });
          } catch (e) {
            console.error('Error sync GCal:', e);
          }
        }
      }

      toast.success('Clases recurrentes creadas correctamente');
      onSuccess?.();

      // If some classes were blocked by Google Calendar, show popup before closing
      if (calendarBlocked.length > 0) {
        setCalendarConflicts(calendarBlocked);
        setShowConflictPopup(true);
        // Don't close yet — user will close popup
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating recurring bookings:', error);
      toast.error('Error al crear las reservas recurrentes. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ['Alumno', 'Asignatura', 'Recurrencia', 'Confirmar'];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="text-[#41f2c0]" size={20} />
            Crear Clases Recurrentes
          </DialogTitle>
          <DialogDescription>
            Programa clases automáticamente para varios días y semanas
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#41f2c0]" size={32} />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Steps */}
            <div className="flex items-center gap-2">
              {stepLabels.map((label, idx) => {
                const num = idx + 1;
                return (
                  <React.Fragment key={num}>
                    <button
                      onClick={() => num < step && setStep(num)}
                      disabled={num > step}
                      className={`flex items-center gap-1.5 ${num <= step ? 'text-[#41f2c0]' : 'text-gray-300'}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        num < step
                          ? 'bg-[#41f2c0] text-white'
                          : num === step
                            ? 'border-2 border-[#41f2c0] text-[#41f2c0]'
                            : 'border-2 border-gray-200 text-gray-300'
                      }`}>
                        {num < step ? <Check size={12} /> : num}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">{label}</span>
                    </button>
                    {idx < stepLabels.length - 1 && (
                      <div className={`flex-1 h-0.5 ${num < step ? 'bg-[#41f2c0]' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step 1: Student */}
            {step === 1 && (
              <div>
                <Label className="text-sm font-medium">Selecciona un alumno</Label>
                {students.length > 0 ? (
                  <Select value={selectedStudent} onValueChange={(val) => {
                    setSelectedStudent(val);
                    setStep(2);
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Elige un alumno" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <User size={14} />
                            <span>{s.full_name}</span>
                            <span className="text-xs text-gray-400">({s.user_email})</span>
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

            {/* Step 2: Subject */}
            {step === 2 && (
              <div>
                <Label className="text-sm font-medium">Selecciona la asignatura</Label>
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
                      {availableSubjects.map(s => (
                        <SelectItem key={s.subject_id} value={s.subject_id}>
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} />
                            <span>{s.subject_name}</span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.level}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-gray-500 text-sm mt-2">Este alumno no tiene asignaturas contigo</p>
                )}
                <Button variant="outline" onClick={() => setStep(1)} className="mt-4" size="sm">
                  Volver
                </Button>
              </div>
            )}

            {/* Step 3: Recurrence Config */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Días y horas de clase</Label>
                  
                  {/* Existing rules */}
                  {recurrenceRules.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {recurrenceRules.map((rule, idx) => {
                        const dayLabel = DAYS_OF_WEEK.find(d => d.value === rule.day)?.fullLabel;
                        return (
                          <Badge
                            key={idx}
                            className="bg-[#41f2c0]/10 text-[#404040] border border-[#41f2c0]/30 flex items-center gap-1.5 px-3 py-1.5"
                          >
                            <span>{dayLabel} · {rule.time}</span>
                            <button onClick={() => removeRule(idx)} className="ml-1 hover:text-red-500">
                              <X size={12} />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Add rule row */}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Día</p>
                      <div className="flex gap-1">
                        {DAYS_OF_WEEK.map(d => (
                          <button
                            key={d.value}
                            onClick={() => setAddingDay(addingDay === d.value ? null : d.value)}
                            className={cn(
                              "w-9 h-9 rounded-lg text-xs font-medium transition-all border",
                              addingDay === d.value
                                ? "bg-[#41f2c0] text-white border-[#41f2c0]"
                                : "bg-white text-gray-600 border-gray-200 hover:border-[#41f2c0]"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Hora</p>
                      <Select value={addingTime} onValueChange={setAddingTime}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent className="max-h-52">
                          {TIME_SLOTS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={addRule}
                      disabled={addingDay === null || !addingTime}
                      className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                      size="sm"
                    >
                      <Plus size={16} className="mr-1" />
                      Añadir
                    </Button>
                  </div>
                </div>

                {/* Number of weeks */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">¿Cuántas semanas?</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={weeks}
                      onChange={e => setWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500">semanas</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Se crearán hasta {recurrenceRules.length * weeks} clases en total
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} size="sm">Volver</Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={recurrenceRules.length === 0}
                    className="bg-[#41f2c0] hover:bg-[#35d4a7]"
                    size="sm"
                  >
                    Ver resumen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Alumno</p>
                    <p className="font-medium text-sm">{students.find(s => s.id === selectedStudent)?.full_name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Asignatura</p>
                    <p className="font-medium text-sm">{selectedSubject?.subject_name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Precio por clase</p>
                    <p className="font-medium text-sm text-[#41f2c0]">{calculatePrice().toFixed(2)}€</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Clases a crear</p>
                    <p className="font-medium text-sm">{validBookings.length}</p>
                  </div>
                </div>

                {conflictCount > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                    ⚠️ {conflictCount} clase{conflictCount > 1 ? 's' : ''} omitida{conflictCount > 1 ? 's' : ''} por conflicto de horario
                  </div>
                )}

                {/* Preview list */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Clases que se crearán ({validBookings.length})
                  </p>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {validBookings.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 bg-[#41f2c0]/5 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-[#41f2c0]" />
                          <span className="capitalize font-medium">
                            {format(b.date, "EEEE d MMM", { locale: es })}
                          </span>
                        </div>
                        <span className="text-gray-600">{b.time} - {calculateEndTime(b.time)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(3)} size="sm">Volver</Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={saving || validBookings.length === 0}
                    className="bg-[#41f2c0] hover:bg-[#35d4a7] flex-1"
                  >
                    {saving ? (
                      <><Loader2 className="animate-spin mr-2" size={16} />Creando {validBookings.length} clases...</>
                    ) : (
                      <><Check size={16} className="mr-2" />Confirmar {validBookings.length} clases</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={showConflictPopup} onOpenChange={(v) => {
      setShowConflictPopup(v);
      if (!v) onOpenChange(false);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle size={20} />
            Clases no creadas por conflicto
          </DialogTitle>
          <DialogDescription>
            Las siguientes clases no se han creado porque coinciden con eventos ya existentes en tu Google Calendar:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto py-2">
          {calendarConflicts.map((b, idx) => (
            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-orange-500" />
                <span className="capitalize font-medium">
                  {format(b.date, "EEEE d MMM", { locale: es })}
                </span>
              </div>
              <span className="text-gray-600">{b.time} - {calculateEndTime(b.time)}</span>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <Button
            onClick={() => {
              setShowConflictPopup(false);
              onOpenChange(false);
            }}
            className="w-full bg-[#41f2c0] hover:bg-[#35d4a7]"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}