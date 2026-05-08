import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Save, X, Pencil, TrendingUp, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            size={18}
            className={`transition-colors ${
              n <= (hovered || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-200 fill-gray-200'
            } ${!readOnly ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProgressNoteCard({ booking, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(booking.progress_note || '');
  const [rating, setRating] = useState(booking.progress_rating || 0);
  const [homeworkDone, setHomeworkDone] = useState(booking.homework_done ?? null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const isPast = new Date(`${booking.date}T${booking.start_time || '00:00'}`) < now;
  const isCompleted = booking.status === 'completed' || (booking.status === 'scheduled' && isPast);
  if (!isCompleted) return null;

  const hasNote = booking.progress_note || booking.progress_rating > 0 || booking.homework_done !== null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Booking.update(booking.id, {
        progress_note: note,
        progress_rating: rating,
        homework_done: homeworkDone
      });
      setEditing(false);
      onUpdate?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNote(booking.progress_note || '');
    setRating(booking.progress_rating || 0);
    setHomeworkDone(booking.homework_done ?? null);
    setEditing(false);
  };

  return (
    <div className="mx-1 mb-3 bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-amber-600" />
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Progreso</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
          >
            <Pencil size={11} />
            {hasNote ? 'Editar' : 'Añadir nota'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-amber-600 mb-1.5">Valoración del alumno</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div>
            <p className="text-xs text-amber-600 mb-1.5">Deberes</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHomeworkDone(homeworkDone === true ? null : true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  homeworkDone === true
                    ? 'bg-green-100 border-green-400 text-green-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-green-300'
                }`}
              >
                <CheckSquare size={13} />
                Hizo los deberes
              </button>
              <button
                type="button"
                onClick={() => setHomeworkDone(homeworkDone === false ? null : false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  homeworkDone === false
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-red-300'
                }`}
              >
                <Square size={13} />
                No hizo los deberes
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-amber-600 mb-1.5">Nota de la clase</p>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="¿Qué trabajasteis? ¿Cómo progresó el alumno?"
              className="text-sm min-h-[80px] bg-white border-amber-200 focus:border-amber-400"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs px-3"
            >
              <Save size={12} className="mr-1" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="text-amber-600 hover:text-amber-800 h-7 text-xs px-3"
            >
              <X size={12} className="mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {booking.progress_rating > 0 && (
            <StarRating value={booking.progress_rating} readOnly />
          )}
          {booking.homework_done !== null && booking.homework_done !== undefined && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              booking.homework_done
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
            }`}>
              {booking.homework_done ? <CheckSquare size={11} /> : <Square size={11} />}
              {booking.homework_done ? 'Deberes hechos' : 'Deberes no hechos'}
            </span>
          )}
          {booking.progress_note ? (
            <p className="text-sm text-amber-900 leading-relaxed">{booking.progress_note}</p>
          ) : (
            <p className="text-xs text-amber-400 italic">Sin nota todavía — añade una valoración de esta clase</p>
          )}
        </div>
      )}
    </div>
  );
}