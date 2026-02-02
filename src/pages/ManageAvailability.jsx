import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import AvailabilityTour from '../components/teacher/AvailabilityTour';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
});

export default function ManageAvailability() {
  const [teacher, setTeacher] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('regular');
  const [showTour, setShowTour] = useState(false);
  
  // Regular schedule state
  const [regularSchedule, setRegularSchedule] = useState({});
  
  // Exception state
  const [exceptions, setExceptions] = useState([]);
  const [newException, setNewException] = useState({
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    is_unavailable: false,
    time_slots: [{ start_time: '09:00', end_time: '17:00' }]
  });

  const loadData = async () => {
    try {
      const user = await base44.auth.me();

      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
        
        // Show tour if not completed
        if (!teachers[0].availability_tour_completed) {
          setShowTour(true);
        }

        const allAvailabilities = await base44.entities.Availability.filter({ 
          teacher_id: teachers[0].id 
        });
        setAvailabilities(allAvailabilities);
        
        // Parse regular schedule
        const schedule = {};
        allAvailabilities
          .filter(a => a.type === 'regular')
          .forEach(a => {
            schedule[a.day_of_week] = {
              enabled: true,
              slots: a.time_slots || []
            };
          });
        setRegularSchedule(schedule);
        
        // Parse exceptions
        setExceptions(allAvailabilities.filter(a => a.type === 'exception'));
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

  const toggleDay = (dayValue) => {
    setRegularSchedule(prev => ({
      ...prev,
      [dayValue]: prev[dayValue]?.enabled 
        ? { ...prev[dayValue], enabled: false }
        : { enabled: true, slots: [{ start_time: '09:00', end_time: '17:00' }] }
    }));
  };

  const updateDaySlot = (dayValue, slotIndex, field, value) => {
    setRegularSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue].slots.map((slot, idx) => 
          idx === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const addSlotToDay = (dayValue) => {
    setRegularSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: [...(prev[dayValue]?.slots || []), { start_time: '09:00', end_time: '10:00' }]
      }
    }));
  };

  const removeSlotFromDay = (dayValue, slotIndex) => {
    setRegularSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        slots: prev[dayValue].slots.filter((_, idx) => idx !== slotIndex)
      }
    }));
  };

  const saveRegularSchedule = async () => {
    setSaving(true);
    try {
      // Delete existing regular schedules
      const existingRegular = availabilities.filter(a => a.type === 'regular');
      for (const a of existingRegular) {
        await base44.entities.Availability.delete(a.id);
      }
      
      // Create new ones
      for (const [dayValue, config] of Object.entries(regularSchedule)) {
        if (config.enabled && config.slots?.length > 0) {
          await base44.entities.Availability.create({
            teacher_id: teacher.id,
            type: 'regular',
            day_of_week: parseInt(dayValue),
            time_slots: config.slots
          });
        }
      }
      
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addException = async () => {
    setSaving(true);
    try {
      await base44.entities.Availability.create({
        teacher_id: teacher.id,
        type: 'exception',
        specific_date: newException.date,
        is_unavailable: newException.is_unavailable,
        time_slots: newException.is_unavailable ? [] : newException.time_slots
      });
      
      setNewException({
        date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        is_unavailable: false,
        time_slots: [{ start_time: '09:00', end_time: '17:00' }]
      });
      
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const deleteException = async (exceptionId) => {
    try {
      await base44.entities.Availability.delete(exceptionId);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

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
        <AvailabilityTour
          teacherId={teacher.id}
          onComplete={() => setShowTour(false)}
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
         <div className="mb-8">
           <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Gestionar Disponibilidad</h1>
           <p className="text-gray-500 mt-2">Configura tu horario habitual y excepciones puntuales</p>
         </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 tabs-list">
          <TabsTrigger value="regular" className="flex items-center gap-2 tab-regular">
            <Clock size={16} />
            Horario Habitual
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="flex items-center gap-2 tab-exceptions">
            <Calendar size={16} />
            Excepciones
          </TabsTrigger>
        </TabsList>

        {/* Regular Schedule */}
        <TabsContent value="regular">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <span className="whitespace-nowrap">Horario Semanal</span>
                <Button
                  onClick={saveRegularSchedule}
                  disabled={saving}
                  className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white save-schedule"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 regular-schedule">
              {DAYS_OF_WEEK.map((day) => {
                const dayConfig = regularSchedule[day.value];
                const isEnabled = dayConfig?.enabled;

                return (
                  <motion.div
                    key={day.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      isEnabled ? "border-[#41f2c0] bg-[#41f2c0]/5" : "border-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleDay(day.value)}
                        />
                        <Label className="font-medium text-[#404040]">{day.label}</Label>
                      </div>
                      
                      {isEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSlotToDay(day.value)}
                          className="text-[#41f2c0]"
                        >
                          <Plus size={16} className="mr-1" />
                          Añadir franja
                        </Button>
                      )}
                    </div>

                    <AnimatePresence>
                      {isEnabled && dayConfig?.slots?.map((slot, slotIdx) => (
                        <motion.div
                        key={slotIdx}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap items-center gap-2 md:gap-3 mt-2"
                        >
                          <Select
                            value={slot.start_time}
                            onValueChange={(v) => updateDaySlot(day.value, slotIdx, 'start_time', v)}
                          >
                            <SelectTrigger className="w-20 md:w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <span className="text-gray-400 text-sm">a</span>
                          
                          <Select
                            value={slot.end_time}
                            onValueChange={(v) => updateDaySlot(day.value, slotIdx, 'end_time', v)}
                          >
                            <SelectTrigger className="w-20 md:w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {dayConfig.slots.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSlotFromDay(day.value, slotIdx)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exceptions */}
        <TabsContent value="exceptions">
          <div className="space-y-6">
            {/* Add Exception Form */}
            <Card>
              <CardHeader>
                <CardTitle>Añadir Excepción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newException.date}
                      onChange={(e) => setNewException({ ...newException, date: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={newException.is_unavailable}
                      onCheckedChange={(v) => setNewException({ ...newException, is_unavailable: v })}
                    />
                    <Label>Marcar como no disponible</Label>
                  </div>
                </div>

                {!newException.is_unavailable && (
                  <div>
                    <Label className="mb-2 block">Horario para este día</Label>
                    {newException.time_slots.map((slot, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                        <Select
                          value={slot.start_time}
                          onValueChange={(v) => {
                            const updated = [...newException.time_slots];
                            updated[idx].start_time = v;
                            setNewException({ ...newException, time_slots: updated });
                          }}
                        >
                          <SelectTrigger className="w-20 md:w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <span className="text-gray-400 text-sm">a</span>
                        
                        <Select
                          value={slot.end_time}
                          onValueChange={(v) => {
                            const updated = [...newException.time_slots];
                            updated[idx].end_time = v;
                            setNewException({ ...newException, time_slots: updated });
                          }}
                        >
                          <SelectTrigger className="w-20 md:w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={addException}
                  disabled={saving}
                  className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
                >
                  {saving ? <Loader2 className="animate-spin" /> : 'Añadir excepción'}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Exceptions */}
            <Card>
              <CardHeader>
                <CardTitle>Excepciones Programadas</CardTitle>
              </CardHeader>
              <CardContent>
                {exceptions.length > 0 ? (
                  <div className="space-y-3 max-w-2xl">
                    {exceptions.map((exception) => (
                      <div
                        key={exception.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            exception.is_unavailable ? "bg-red-100" : "bg-[#41f2c0]/10"
                          )}>
                            {exception.is_unavailable ? (
                              <X className="text-red-500" size={20} />
                            ) : (
                              <Check className="text-[#41f2c0]" size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#404040] capitalize">
                              {format(new Date(exception.specific_date), "EEEE, d 'de' MMMM", { locale: es })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {exception.is_unavailable 
                                ? 'No disponible'
                                : exception.time_slots?.map(s => `${s.start_time} - ${s.end_time}`).join(', ')
                              }
                            </p>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteException(exception.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto mb-2 text-gray-300" size={32} />
                    <p>No hay excepciones programadas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </>
  );
}