import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const TIME_SLOTS = Array.from({ length: 34 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
});

export default function ManageAvailability() {
  const [teacher, setTeacher] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regularSchedule, setRegularSchedule] = useState({});

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const teachers = await base44.entities.Teacher.filter({ user_email: user.email });
      if (teachers.length > 0) {
        setTeacher(teachers[0]);
        const allAvailabilities = await base44.entities.Availability.filter({ teacher_id: teachers[0].id });
        setAvailabilities(allAvailabilities);

        const schedule = {};
        allAvailabilities
          .filter(a => a.type === 'regular')
          .forEach(a => {
            schedule[a.day_of_week] = { enabled: true, slots: a.time_slots || [] };
          });
        setRegularSchedule(schedule);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
      const existingRegular = availabilities.filter(a => a.type === 'regular');
      for (const a of existingRegular) {
        await base44.entities.Availability.delete(a.id);
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#41f2c0]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-lg sm:text-3xl font-bold text-[#404040]">Gestionar Disponibilidad</h1>
        <p className="text-gray-500 mt-2 text-sm">Configura tu horario habitual semanal</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <Clock size={20} className="text-[#41f2c0]" />
              Horario Semanal
            </span>
            <Button
              onClick={saveRegularSchedule}
              disabled={saving}
              className="bg-[#41f2c0] hover:bg-[#35d4a7] text-white"
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
        <CardContent className="space-y-4">
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
                    <Switch checked={isEnabled} onCheckedChange={() => toggleDay(day.value)} className="data-[state=checked]:bg-[#41f2c0]" />
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
    </div>
  );
}