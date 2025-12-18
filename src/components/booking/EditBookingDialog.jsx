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
import { format, addDays, getDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Calendar, Clock } from 'lucide-react';
import BookingCalendar from './BookingCalendar';

export default function EditBookingDialog({ booking, open, onClose, onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilities, setAvailabilities] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

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

  const availableSlots = useMemo(() => {
    if (!booking) return {};
    
    const slots = {};
    
    for (let i = 0; i < 30; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);
      
      const exception = availabilities.find(
        a => a.type === 'exception' && a.specific_date === dateStr
      );
      
      if (exception) {
        if (exception.is_unavailable) continue;
        slots[dateStr] = exception.time_slots?.map(s => s.start_time) || [];
      } else {
        const regular = availabilities.find(
          a => a.type === 'regular' && a.day_of_week === dayOfWeek
        );
        if (regular && regular.time_slots) {
          slots[dateStr] = regular.time_slots.map(s => s.start_time);
        }
      }
      
      if (slots[dateStr]) {
        const bookedSlots = existingBookings
          .filter(b => b.date === dateStr)
          .map(b => b.start_time);
        
        slots[dateStr] = slots[dateStr].filter(s => !bookedSlots.includes(s));
      }
    }
    
    return slots;
  }, [availabilities, existingBookings, booking]);

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
      await base44.entities.Booking.update(booking.id, {
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedTime,
        end_time: calculateEndTime(selectedTime, booking.duration_minutes || 60)
      });
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

            <BookingCalendar
              availableSlots={availableSlots}
              existingBookings={existingBookings}
              onSelectSlot={handleSlotSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />

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